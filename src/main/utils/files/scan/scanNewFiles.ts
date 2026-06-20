import { notifier } from '@main/services/notifier.service'
import {
  createThumbnails,
  getThumbnailQuality,
} from '@main/services/thumbnails.service'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { EVENTS } from '@main/types/constants.shared'
import { ImageModel } from '@main/types/models.shared'
import {
  NotifyImageThumbnailGeneratedPartPayload,
  NotifyImageThumbnailGenerationCompletePayload,
} from '@main/types/notifier.shared'
import Batcher from '@main/utils/batcher'
import { FileInfo } from '@main/types/global'
import { THUMBNAILS_DIR } from '@main/utils/files/config'
import { ImageRepository } from '@main/utils/repositories/Image'
import { computeFileHash } from '@main/utils/files/hashing'
import { extractDominantColors } from '@main/utils/files/colorExtractor'
import { extractExif } from '@main/utils/files/exif'
import { join } from 'path'
import Database from 'better-sqlite3'

const THUMBNAIL_WIDTH = 512

export async function scanNewFiles(
  imageRepo: ImageRepository,
  sender: Electron.WebContents,
  folderPath: string,
  imageFiles: FileInfo[],
  currentPaths: string[],
  db?: Database.Database,
): Promise<void> {
  const newPaths = imageRepo.getPathsNotInImagesTable(currentPaths)
  if (newPaths.length === 0) return

  const newPathsSet = new Set(newPaths)
  const newFilesRaw = imageFiles.filter(file => newPathsSet.has(file.fullPath))

  console.log(`Processing ${newPaths.length} new files...`)

  // Compute hashes and extract EXIF for new files to enable matching and rich metadata
  const newFilesWithHashAndColor = await Promise.all(
    newFilesRaw.map(async file => {
      const hash = await computeFileHash(file.fullPath)
      const dominantColors = await extractDominantColors(file.fullPath)
      const exifData = await extractExif(file.fullPath)
      return {
        ...file,
        hash,
        dominantColors,
        exif: exifData ? JSON.stringify(exifData) : null,
        isDuplicate: undefined as number | undefined,
      }
    }),
  )

  let filesToInsert = newFilesWithHashAndColor

  const missingImages = imageRepo.getMissingImages()

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

    let processedCount = 0
    const timeStamp = Date.now()

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
      thumbnailOptions: {
        width: THUMBNAIL_WIDTH,
        quality: db ? (getThumbnailQuality(db) ?? undefined) : undefined,
      },
    })
  }
}
