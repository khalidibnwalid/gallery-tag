import { ImageModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { ImageRepository } from '@main/utils/repositories/Image'
import { EVENTS } from '@main/types/constants.shared'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { join, basename, extname } from 'path'
import fs from 'fs/promises'
import { moveFile } from '@main/utils/files/move'
import { getRootPath } from '@main/utils/files/config'

export default async function moveToHandler(
  event: Electron.IpcMainInvokeEvent,
  imageId: number | number[],
  targetFolderPath: string,
): Promise<ImageModel | ImageModel[]> {
  const connectedPaths = db.getConnectedPaths()
  if (connectedPaths.length === 0) {
    throw new Error(
      'No active database connection found. Please load a folder first.',
    )
  }

  const rootPath = getRootPath(connectedPaths[0])
  const database = db.getDatabase(connectedPaths[0])
  const imageRepo = new ImageRepository(database, rootPath)

  const ids = Array.isArray(imageId) ? imageId : [imageId]
  const images = imageRepo.getImagesByIds(ids)
  const imagesMap = new Map(images.map(img => [img.id, img]))
  const updatedImages: ImageModel[] = []

  for (const id of ids) {
    const image = imagesMap.get(id)
    if (!image) {
      throw new Error(`Image with ID ${id} not found in database.`)
    }

    const sourcePath = image.filePath
    const originalFileName = basename(sourcePath)
    let finalFileName = originalFileName
    let finalDestPath = join(targetFolderPath, finalFileName)

    if (sourcePath === finalDestPath) {
      updatedImages.push(image)
      continue
    }

    // Check if source exists
    try {
      await fs.access(sourcePath)
    } catch {
      throw new Error(`Source file does not exist on disk: ${sourcePath}`)
    }

    // Check if destination directory exists
    try {
      await fs.access(targetFolderPath)
    } catch {
      throw new Error(`Target folder does not exist: ${targetFolderPath}`)
    }

    // Resolve duplicate filename conflict at target
    let counter = 1
    while (true) {
      try {
        await fs.access(finalDestPath)
        const ext = extname(originalFileName)
        const nameWithoutExt = basename(originalFileName, ext)
        finalFileName = `${nameWithoutExt}_${counter}${ext}`
        finalDestPath = join(targetFolderPath, finalFileName)
        counter++
      } catch {
        break
      }
    }

    // Move file physically
    await moveFile(sourcePath, finalDestPath)

    // Update path in database
    imageRepo.updateImagePathAndName(id, finalDestPath, finalFileName)

    const updatedImage = imageRepo.getImageById(id)
    if (!updatedImage) {
      throw new Error('Failed to retrieve updated image details.')
    }

    updatedImages.push(updatedImage)
  }

  // Notify renderer process of updated image metadata
  if (updatedImages.length > 0) {
    event.sender.send(EVENTS.UPDATE_IMAGE, {
      type: 'update',
      payload: {
        images: updatedImages,
      } satisfies ImageUpdatePayload,
    })
  }

  return Array.isArray(imageId) ? updatedImages : updatedImages[0]
}
