import { EXTENSIONS, getFilesByExtension } from '@main/utils/getFiles'

export default async function getImageFilesHandler(
  _: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<string[]> {
  try {
    const imageFiles = await getFilesByExtension(folderPath, EXTENSIONS.IMAGES)

    return imageFiles.map(file => file.fullPath)
  } catch (error) {
    console.error('Error getting image files:', error)
    return []
  }
}
