import { createThumbnails } from '@main/services/thumbnails.service'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { EVENTS } from '@main/types/constants.shared'
import { ImageModel } from '@main/types/models.shared'
import Batcher from '@main/utils/batcher'
import {
  CONFIG_DIR,
  getAndInitConfig,
  THUMBNAILS_DIR,
} from '@main/utils/config'
import {
  deleteDiffImagesByPath,
  getAllImagesFromDb,
  getPathsNotInImagesTable,
  insertImages,
  updateThumbnailPaths,
} from '@main/utils/db/Image'
import { EXTENSIONS, getFilesByExtension } from '@main/utils/getFiles'
import { join } from 'path'

const THUMBNAIL_WIDTH = 512

export default async function getImageFilesHandler(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<ImageModel[]> {
  try {
    const sender = event.sender
    console.log(`Scanning folder: ${folderPath}`)

    const { db } = await getAndInitConfig(folderPath)

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
        },
      })

      let count = 0
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
        },
        onProgress(currentResult) {
          if (currentResult.error !== undefined) return

          const payload = {
            filePath: currentResult.imagePath,
            thumbnailPath: currentResult.outputPath,
          }
          imageUpdateBatcher.add(payload)
        },
        onError: error => {
          console.error('Error generating thumbnails:', error)
        },
        thumbnailOptions: { width: THUMBNAIL_WIDTH },
      })
    }
    // get all image paths from database (after update and delete)
    const images = getAllImagesFromDb(db)

    // Get database statistics
    // const stats = getImageStats(db)
    console.log(`Returning ${images.length} image paths`)
    return images
  } catch (error) {
    console.error('Error getting image files:', error)
    return []
  }
}
