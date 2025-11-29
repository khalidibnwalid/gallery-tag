import { getConfig } from '@main/utils/config'
import {
  deleteDiffImagesByPath,
  getImagePathsFromDb,
  getPathsNotInImagesTable,
  insertImages,
} from '@main/utils/db/Image'
import { EXTENSIONS, getFilesByExtension } from '@main/utils/getFiles'

export default async function getImageFilesHandler(
  _: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<string[]> {
  try {
    console.log(`Scanning folder: ${folderPath}`)

    const { db } = await getConfig(folderPath)

    const imageFiles = await getFilesByExtension(folderPath, EXTENSIONS.IMAGES)
    console.log(`Found ${imageFiles.length} image files`)

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
    }
    // get all image paths from database (after update and delete)
    const imagePaths = getImagePathsFromDb(db)

    // Get database statistics
    // const stats = getImageStats(db)

    db.close()

    console.log(`Returning ${imagePaths.length} image paths`)
    return imagePaths
  } catch (error) {
    console.error('Error getting image files:', error)
    return []
  }
}
