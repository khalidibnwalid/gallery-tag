import { notifier } from '@main/services/notifier.service'
import { createThumbnails } from '@main/services/thumbnails.service'
import { ImageUpdatePayload, SearchFilter } from '@main/types/api.shared'
import { EVENTS } from '@main/types/constants.shared'
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
} from '@main/utils/config'
import { syncFoldersFromDisk } from '@main/utils/db/Folder'
import {
  deleteDiffImagesByPath,
  getAllImagesWithTags,
  getAllImagesWithTagsPaginated,
  getImagesWithoutHash,
  getMissingImages,
  getPathsNotInImagesTable,
  insertImages,
  recoverImage,
  updateImageHash,
  updateThumbnailPaths,
} from '@main/utils/db/Image'
import { EXTENSIONS, getFilesByExtension } from '@main/utils/getFiles'
import { computeFileHash } from '@main/utils/hashing'
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
  | (ImageModel & { tags?: string })[]
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

    await syncFoldersFromDisk(db, folderPath)

    const imageFiles = await getFilesByExtension(
      folderPath,
      EXTENSIONS.IMAGES,
      CONFIG_DIR,
    )

    const currentPaths = imageFiles.map(file => file.fullPath)

    // 1. Get missing images (candidates for recovery)
    const missingImages = getMissingImages(db, currentPaths)

    // 2. Identify new candidates
    const newPaths = getPathsNotInImagesTable(db, currentPaths)
    const newPathsSet = new Set(newPaths)
    const newFilesRaw = imageFiles.filter(file =>
      newPathsSet.has(file.fullPath),
    )

    // List of files that need to be inserted as new records
    // Start with all new files, will filter out recovered ones
    let filesToInsert = newFilesRaw.map(f => ({
      ...f,
      hash: undefined as string | undefined,
    }))

    if (newPaths.length > 0) {
      console.log(`Processing ${newPaths.length} new files...`)

      // Compute hashes for new files to enable matching
      // We use a concurrency limit if needed, but for now Promise.all is okay for reasonable batches
      const newFilesWithHash = await Promise.all(
        newFilesRaw.map(async file => ({
          ...file,
          hash: await computeFileHash(file.fullPath),
        })),
      )

      filesToInsert = newFilesWithHash

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
            // Match found - recover the image record
            const oldImage = missingHashMap.get(file.hash)!

            recoverImage(db, oldImage.id, file)
            console.log(
              `Recovered image: ${oldImage.filePath} -> ${file.fullPath}`,
            )

            // Consume the match
            missingHashMap.delete(file.hash)
            recoveredCount++
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
        insertImages(db, filesToInsert)
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
            updateThumbnailPaths(db, images)

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

    // 3. Cleanup: Delete images that are truly missing (and not recovered)
    const numRemoved = deleteDiffImagesByPath(db, currentPaths)
    if (numRemoved > 0) {
      console.log(`Removed ${numRemoved} stale image records from database`)
    }

    // 4. Background: Backfill hashes for existing images (limit 50 per scan to avoid performance hit)
    const unhashedImages = getImagesWithoutHash(db)
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
            updateImageHash(db, img.id, hash)
          } catch (error) {
            // Ignore errors for individual files
          }
        }),
      ).then(() => {
        console.log('Background hash backfill batch complete')
      })
    }

    if (isPaginated) {
      const { data: images, total } = getAllImagesWithTagsPaginated(
        db,
        offset!,
        size!,
        filter,
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
      const images = getAllImagesWithTags(db)

      console.log(`Returning ${images.length} image paths`)
      return images
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
      return []
    }
  }
}

export default async function getAllHandler(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<(ImageModel & { tags?: string })[]> {
  return (await getAllBase(event, folderPath)) as (ImageModel & {
    tags?: string
  })[]
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
