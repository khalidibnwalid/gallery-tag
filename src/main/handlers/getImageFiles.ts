import { ImageModel } from '@main/types/models.shared'
import { CONFIG_DIR, getAndInitConfig, THUMBNAILS_DIR } from '@main/utils/config'
import {
  deleteDiffImagesByPath,
  getAllImagesFromDb,
  getPathsNotInImagesTable,
  insertImages,
} from '@main/utils/db/Image'
import { EXTENSIONS, getFilesByExtension } from '@main/utils/getFiles'
import { createThumbnailsInWorkers } from '@main/workers/thumbnail.service'
import { join } from 'path'

export default async function getImageFilesHandler(
  _: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<ImageModel[]> {
  try {
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

      let count = 0
      const timeStamp = Date.now()
      createThumbnailsInWorkers(
        newFiles.map(file => ({
          imagePath: file.fullPath,
          outputPath: join(
            folderPath,
            THUMBNAILS_DIR,
            file.fileName + '_' + timeStamp + '_' + count++ + '_.webp',
          ),
        })),
        {
          onComplete: result => {
            console.log(
              `Thumbnail generation complete: ${result.totalProcessed} processed, ${result.totalFailed} failed`,
            )
          },
          onProgress(currentResult, completed, total) {
            console.log(
              `Thumbnail progress: ${completed}/${total} - ${currentResult.imagePath}`,
            )
          },
          onError: error => {
            console.error('Error generating thumbnails:', error)
          },
          thumbnailOptions: { width: 512 },
        },
      )
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
