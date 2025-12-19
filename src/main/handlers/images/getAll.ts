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
  getPathsNotInImagesTable,
  insertImages,
  updateThumbnailPaths,
} from '@main/utils/db/Image'
import { EXTENSIONS, getFilesByExtension } from '@main/utils/getFiles'
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

    // current image paths for diffing
    const numRemoved = deleteDiffImagesByPath(db, currentPaths)
    if (numRemoved > 0) {
      console.log(`Removed ${numRemoved} stale image records from database`)
    }

    const newPaths = getPathsNotInImagesTable(db, currentPaths)
    const newPathsSet = new Set(newPaths)
    const newFiles = imageFiles.filter(file => newPathsSet.has(file.fullPath))
    if (newPaths.length > 0) {
      insertImages(db, newFiles)
      console.log(`Inserted ${newFiles.length} new images into database`)
      const imageUpdateBatcher = new Batcher<{
        filePath: string
        thumbnailPath: string
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
              total: newFiles.length,
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
        tasks: newFiles.map(file => ({
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
            order: processedCount,
            total: newFiles.length,
          }
          imageUpdateBatcher.add(payload)
        },
        onError: error => {
          console.error('Error generating thumbnails:', error)
        },
        thumbnailOptions: { width: THUMBNAIL_WIDTH },
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
