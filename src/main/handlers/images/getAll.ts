import { notifier } from '@main/services/notifier.service'
import { createThumbnails } from '@main/services/thumbnails.service'
import { clipService } from '@main/services/clip.service'
import { ImageUpdatePayload, SearchFilter } from '@main/types/api.shared'
import {
  EVENTS,
  NOTIFIER_EVENTS,
  NOTIFIER_EVENT_TYPES,
} from '@main/types/constants.shared'
import { ImageModel, PaginatedResult } from '@main/types/models.shared'
import {
  NotifyImageThumbnailGeneratedPartPayload,
  NotifyImageThumbnailGenerationCompletePayload,
} from '@main/types/notifier.shared'
import Batcher from '@main/utils/batcher'
import {
  CONFIG_DIR,
  getAndInitConfig,
  THUMBNAILS_DIR,
} from '@main/utils/files/config'
import { FolderRepository } from '@main/utils/repositories/Folder'
import { ImageRepository } from '@main/utils/repositories/Image'
import { EXTENSIONS, getFilesByExtension } from '@main/utils/files/getFiles'
import { computeFileHash } from '@main/utils/files/hashing'
import { extractDominantColors } from '@main/utils/files/colorExtractor'
import { join } from 'path'

const THUMBNAIL_WIDTH = 512

async function getAllBase(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  offset?: number,
  size?: number,
  filter?: SearchFilter,
): Promise<
  | PaginatedResult<ImageModel & { tags?: string }>
  | { data: (ImageModel & { tags?: string })[]; total: number }
> {
  try {
    const sender = event.sender
    const isPaginated = offset !== undefined && size !== undefined

    console.log(
      isPaginated
        ? `Getting paginated images for folder: ${folderPath}, offset: ${offset}, size: ${size}, filter: ${JSON.stringify(filter)}`
        : `Scanning folder: ${folderPath}`,
    )

    const { db } = await getAndInitConfig(folderPath)
    const folderRepo = new FolderRepository(db)
    const imageRepo = new ImageRepository(db)

    await folderRepo.syncFoldersFromDisk(folderPath)

    const imageFiles = await getFilesByExtension(
      folderPath,
      EXTENSIONS.IMAGES,
      CONFIG_DIR,
    )

    const currentPaths = imageFiles.map(file => file.fullPath)

    // Mark missing images as soft-deleted
    const numSoftDeleted = imageRepo.markMissingImagesAsDeleted(currentPaths)
    if (numSoftDeleted > 0) {
      console.log(`Soft-deleted ${numSoftDeleted} missing images`)
    }

    // Purge deleted images older than 30 days
    const numPurged = imageRepo.purgeExpiredDeletedImages()
    if (numPurged > 0) {
      console.log(
        `Purged ${numPurged} expired soft-deleted images from database`,
      )
    }

    // 0. Same-path recovery: soft-deleted images whose file still exists at the
    const softDeletedAtCurrentPaths =
      imageRepo.getSoftDeletedImagesAtPaths(currentPaths)
    if (softDeletedAtCurrentPaths.length > 0) {
      const currentFileMap = new Map(imageFiles.map(f => [f.fullPath, f]))
      for (const img of softDeletedAtCurrentPaths) {
        const fileInfo = currentFileMap.get(img.filePath)
        if (fileInfo) {
          imageRepo.recoverImage(img.id, fileInfo)
          console.log(`Same-path recovery: ${img.filePath}`)
        }
      }
      console.log(
        `Recovered ${softDeletedAtCurrentPaths.length} same-path soft-deleted images`,
      )
    }

    // 1. Get missing images (candidates for hash-based recovery)
    const missingImages = imageRepo.getMissingImages()

    // 2. Identify new candidates (excludes already-active and just-recovered paths)
    const newPaths = imageRepo.getPathsNotInImagesTable(currentPaths)
    const newPathsSet = new Set(newPaths)
    const newFilesRaw = imageFiles.filter(file =>
      newPathsSet.has(file.fullPath),
    )

    // List of files that need to be inserted as new records
    // Start with all new files, will filter out recovered ones
    let filesToInsert = newFilesRaw.map(f => ({
      ...f,
      hash: undefined as string | undefined,
      dominantColors: undefined as string[] | undefined,
      isDuplicate: undefined as number | undefined,
    }))

    if (newPaths.length > 0) {
      console.log(`Processing ${newPaths.length} new files...`)

      // Compute hashes for new files to enable matching
      // We use a concurrency limit if needed, but for now Promise.all is okay for reasonable batches
      const newFilesWithHashAndColor = await Promise.all(
        newFilesRaw.map(async file => ({
          ...file,
          hash: await computeFileHash(file.fullPath),
          dominantColors: await extractDominantColors(file.fullPath),
          isDuplicate: undefined as number | undefined,
        })),
      )

      filesToInsert = newFilesWithHashAndColor

      // Attempt recovery if there are missing images to match against
      if (missingImages.length > 0) {
        const missingHashMap = new Map<string, ImageModel>()

        // Build generic map of hash -> image
        for (const img of missingImages) {
          if (img.hash) missingHashMap.set(img.hash, img)
        }

        const unmatchedFiles: typeof filesToInsert = []
        let recoveredCount = 0

        for (const file of filesToInsert) {
          if (file.hash && missingHashMap.has(file.hash)) {
            // Check if we have an active image in the DB with the same hash
            const hasActive = imageRepo.hasActiveImageWithHash(file.hash)

            if (!hasActive) {
              // Match found and no active duplicate exists - recover the image record
              const oldImage = missingHashMap.get(file.hash)!

              imageRepo.recoverImage(oldImage.id, file)
              console.log(
                `Recovered image: ${oldImage.filePath} -> ${file.fullPath}`,
              )

              // Consume the match
              missingHashMap.delete(file.hash)
              recoveredCount++
            } else {
              // Active image with same hash exists: mark this as duplicate and let it be inserted
              unmatchedFiles.push({
                ...file,
                isDuplicate: 1,
              })
            }
          } else {
            // No match found
            unmatchedFiles.push(file)
          }
        }

        if (recoveredCount > 0) {
          console.log(
            `Successfully recovered ${recoveredCount} images using hash matching`,
          )
        }

        filesToInsert = unmatchedFiles
      }

      // Insert the truly new files
      if (filesToInsert.length > 0) {
        imageRepo.insertImages(filesToInsert)
        console.log(`Inserted ${filesToInsert.length} new images into database`)

        // Start thumbnail generation for inserted files
        const imageUpdateBatcher = new Batcher<{
          filePath: string
          thumbnailPath: string
          width?: number
          height?: number
        }>({
          batchSize: 50,
          debounceTime: 500,
          callbackFn: images => {
            sender.send(EVENTS.UPDATE_IMAGE, {
              type: 'update',
              payload: { images } satisfies ImageUpdatePayload,
            })
            imageRepo.updateThumbnailPaths(images)

            notifier.notify<NotifyImageThumbnailGeneratedPartPayload>({
              id: 'image-thumbnail-generated',
              type: 'progress.part',
              payload: {
                data: images[images.length - 1],
                total: filesToInsert.length,
                sessionId: timeStamp.toString(),
                order: processedCount,
              },
            })
          },
        })

        let count = 0
        let processedCount = 0
        const timeStamp = Date.now()

        createThumbnails({
          tasks: filesToInsert.map(file => ({
            imagePath: file.fullPath,
            outputPath: join(
              folderPath,
              THUMBNAILS_DIR,
              file.fileName + '_' + timeStamp + '_' + count++ + '_.webp',
            ),
          })),
          onComplete: result => {
            console.log(
              `Thumbnail generation complete: ${result.totalProcessed} processed, ${result.totalFailed} failed`,
            )
            imageUpdateBatcher.flush()

            notifier.notify<NotifyImageThumbnailGenerationCompletePayload>({
              id: 'image-thumbnail-generated',
              type: 'progress.complete',
              payload: {
                totalProcessed: result.totalProcessed,
                totalFailed: result.totalFailed,
                sessionId: timeStamp.toString(),
              },
            })
          },
          onProgress(currentResult) {
            if (currentResult.error !== undefined) return

            processedCount++
            const payload = {
              filePath: currentResult.imagePath,
              thumbnailPath: currentResult.outputPath,
              width: currentResult.originalWidth,
              height: currentResult.originalHeight,
              order: processedCount,
              total: filesToInsert.length,
            }
            imageUpdateBatcher.add(payload)
          },
          onError: error => {
            console.error('Error generating thumbnails:', error)
          },
          thumbnailOptions: { width: THUMBNAIL_WIDTH },
        })
      }
    }

    // 4. Background: Backfill hashes for existing images (limit 50 per scan to avoid performance hit)
    const unhashedImages = imageRepo.getImagesWithoutHash()
    if (unhashedImages.length > 0) {
      const batch = unhashedImages.slice(0, 50)
      console.log(
        `Backfilling hashes for ${batch.length} images (out of ${unhashedImages.length} remaining)...`,
      )
      // Fire and forget - do not await
      Promise.allSettled(
        batch.map(async img => {
          try {
            const hash = await computeFileHash(img.filePath)
            imageRepo.updateImageHash(img.id, hash)
          } catch (error) {
            // Ignore errors for individual files
          }
        }),
      ).then(() => {
        console.log('Background hash backfill batch complete')
      })
    }

    // 5. Background: Backfill dominant colors for existing images (limit 50 per scan)
    const colorlessImages = imageRepo.getImagesWithoutDominantColors()
    if (colorlessImages.length > 0) {
      const batch = colorlessImages.slice(0, 50)
      console.log(
        `Backfilling dominant colors for ${batch.length} images (out of ${colorlessImages.length} remaining)...`,
      )
      // Fire and forget - do not await
      Promise.allSettled(
        batch.map(async img => {
          try {
            let colors = img.dominantColors
            if (!colors || colors.length === 0) {
              colors = await extractDominantColors(img.filePath)
            }
            imageRepo.updateImageDominantColors(img.id, colors)
          } catch (error) {
            // Ignore errors for individual files
          }
        }),
      ).then(() => {
        console.log('Background dominant colors backfill batch complete')
      })
    }

    // 6. Background: Compute CLIP embeddings for unembedded images
    const processEmbeddings = async () => {
      try {
        const unembedded = imageRepo.getImagesWithoutEmbeddings()
        if (unembedded.length === 0) return

        console.log(
          `CLIP: Starting embedding generation for ${unembedded.length} images...`,
        )

        await clipService.init(join(folderPath, CONFIG_DIR))

        const sessionId = Date.now().toString()
        let order = 0

        notifier.notify({
          id: NOTIFIER_EVENTS.IMAGES.EMBEDDING_GENERATED,
          type: NOTIFIER_EVENT_TYPES.PROGRESS_PART,
          payload: {
            order: 0,
            total: unembedded.length,
            sessionId,
          },
        })

        let totalProcessed = 0
        let totalFailed = 0

        for (const img of unembedded) {
          try {
            const embedding = await clipService.getImageEmbedding(img.filePath)
            imageRepo.insertImageEmbedding(img.id, embedding)
            totalProcessed++
          } catch (error) {
            console.error(
              `Failed to generate embedding for ${img.filePath}:`,
              error,
            )
            totalFailed++
          }

          order++
          notifier.notify({
            id: NOTIFIER_EVENTS.IMAGES.EMBEDDING_GENERATED,
            type: NOTIFIER_EVENT_TYPES.PROGRESS_PART,
            payload: {
              order,
              total: unembedded.length,
              sessionId,
            },
          })
        }

        console.log(
          `CLIP: Embedding generation complete. Processed ${totalProcessed}, failed ${totalFailed}`,
        )
        notifier.notify({
          id: NOTIFIER_EVENTS.IMAGES.EMBEDDING_GENERATED,
          type: NOTIFIER_EVENT_TYPES.PROGRESS_COMPLETE,
          payload: {
            totalProcessed,
            totalFailed,
            sessionId,
          },
        })
      } catch (err) {
        console.error('Error in background embedding generation:', err)
      }
    }

    processEmbeddings()

    let aiEmbedding: Float32Array | undefined = undefined
    if (filter?.aiSearchText) {
      console.log(`AI Text Search: "${filter.aiSearchText}"`)
      await clipService.init(join(folderPath, CONFIG_DIR))
      aiEmbedding = await clipService.getTextEmbedding(filter.aiSearchText)
    } else if (filter?.aiSearchImage) {
      console.log(`AI Image Search: "${filter.aiSearchImage}"`)
      await clipService.init(join(folderPath, CONFIG_DIR))
      aiEmbedding = await clipService.getImageEmbedding(filter.aiSearchImage)
    }

    if (isPaginated) {
      const { data: images, total } = imageRepo.getAllImagesWithTagsPaginated(
        offset!,
        size!,
        filter,
        aiEmbedding,
      )
      const hasMore = offset! + size! < total

      console.log(
        `Returning ${images.length} image paths (${offset}-${offset! + size! - 1} of ${total})`,
      )

      return {
        data: images,
        pagination: {
          offset: offset!,
          size: size!,
          total,
          hasMore,
        },
      }
    } else {
      // get all image paths from database (after update and delete)
      const result = imageRepo.getAllImagesWithTags()

      console.log(`Returning ${result.total} image paths`)
      return result
    }
  } catch (error) {
    console.error('Error getting image files:', error)

    if (offset !== undefined && size !== undefined) {
      return {
        data: [],
        pagination: {
          offset,
          size,
          total: 0,
          hasMore: false,
        },
      }
    } else {
      return { data: [], total: 0 }
    }
  }
}

export default async function getAllHandler(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<{ data: (ImageModel & { tags?: string })[]; total: number }> {
  return (await getAllBase(event, folderPath)) as {
    data: (ImageModel & { tags?: string })[]
    total: number
  }
}

export async function getPaginatedHandler(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  offset: number = 0,
  size: number = 50,
  filter?: SearchFilter,
): Promise<PaginatedResult<ImageModel & { tags?: string }>> {
  return (await getAllBase(
    event,
    folderPath,
    offset,
    size,
    filter,
  )) as PaginatedResult<ImageModel & { tags?: string }>
}
