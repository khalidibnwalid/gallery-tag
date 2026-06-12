import { db } from '@main/utils/repositories/db'
import { ImageRepository } from '@main/utils/repositories/Image'
import { EVENTS } from '@main/types/constants.shared'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { deleteFileToTrash } from '@main/utils/files/delete'
import { getRootPath } from '@main/utils/files/config'

export default async function deleteImagesHandler(
  event: Electron.IpcMainInvokeEvent,
  imageIds: number | number[],
): Promise<void> {
  const connectedPaths = db.getConnectedPaths()
  if (connectedPaths.length === 0) {
    throw new Error('No active database connection found. Please load a folder first.')
  }
  
  const rootPath = getRootPath(connectedPaths[0])
  const database = db.getDatabase(connectedPaths[0])
  const imageRepo = new ImageRepository(database, rootPath)

  const ids = Array.isArray(imageIds) ? imageIds : [imageIds]
  const deletedImages: { id: number; filePath: string }[] = []

  for (const id of ids) {
    const image = imageRepo.getImageById(id)
    if (!image) continue

    // Move to trash
    try {
      await deleteFileToTrash(image.filePath)
    } catch (err: any) {
      console.error(`Failed to move file to trash: ${image.filePath}`, err)
      throw new Error(`Failed to trash file: ${image.fileName}. ${err.message}`)
    }

    deletedImages.push({ id, filePath: image.filePath })
  }

  // Perform soft deletion in DB
  if (ids.length > 0) {
    imageRepo.softDeleteImages(ids)
  }

  // Notify renderer process to remove these images from current queries
  if (deletedImages.length > 0) {
    event.sender.send(EVENTS.UPDATE_IMAGE, {
      type: 'update',
      payload: {
        images: deletedImages.map(img => ({
          id: img.id,
          filePath: `deleted://${img.id}`,
          deletedAt: new Date().toISOString(),
        })),
      } satisfies ImageUpdatePayload,
    })
  }
}
