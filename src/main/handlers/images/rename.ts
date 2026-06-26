import { ImageModel } from '@main/types/models.shared'
import { ImageRepository } from '@main/utils/repositories/Image'
import { EVENTS } from '@main/types/constants.shared'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { dirname, join, extname } from 'path'
import fs from 'fs/promises'
import { moveFile } from '@main/utils/files/move'
import { getAndInitConfig } from '@main/utils/files/config'

export default async function renameHandler(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  imageId: number,
  newName: string,
): Promise<ImageModel> {
  const { db: database } = await getAndInitConfig(folderPath)
  const rootPath = folderPath
  const imageRepo = new ImageRepository(database, rootPath)

  const image = imageRepo.getImageById(imageId)
  if (!image) {
    throw new Error(`Image with ID ${imageId} not found in database.`)
  }

  const sourcePath = image.filePath
  const originalDir = dirname(sourcePath)
  const ext = extname(sourcePath)

  // Ensure target has the correct extension
  let finalFileName = newName.trim()
  if (!finalFileName.toLowerCase().endsWith(ext.toLowerCase())) {
    finalFileName = `${finalFileName}${ext}`
  }

  const finalDestPath = join(originalDir, finalFileName)

  if (sourcePath === finalDestPath) {
    return image
  }

  // Check if source exists
  try {
    await fs.access(sourcePath)
  } catch {
    throw new Error(`Source file does not exist on disk: ${sourcePath}`)
  }

  // Check if destination already exists
  try {
    await fs.access(finalDestPath)
    throw new Error(
      `A file named "${finalFileName}" already exists in this directory.`,
    )
  } catch (err: unknown) {
    if ((err as Error).message.includes('already exists')) {
      throw err
    }
    // Destination doesn't exist, which is what we want
  }

  // Rename physical file
  await moveFile(sourcePath, finalDestPath)

  // Update DB entry
  imageRepo.updateImagePathAndName(imageId, finalDestPath, finalFileName)

  const updatedImage = imageRepo.getImageById(imageId)
  if (!updatedImage) {
    throw new Error('Failed to retrieve updated image details.')
  }

  // Notify renderer process
  event.sender.send(EVENTS.UPDATE_IMAGE, {
    type: 'update',
    payload: {
      images: [updatedImage],
    } satisfies ImageUpdatePayload,
  })

  return updatedImage
}
