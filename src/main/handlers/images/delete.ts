import { ImageUpdatePayload, SearchFilter } from '@main/types/api.shared'
import { EVENTS } from '@main/types/constants.shared'
import { getAndInitConfig } from '@main/utils/files/config'
import { deleteFileToTrash } from '@main/utils/files/delete'
import { ImageRepository } from '@main/utils/repositories/Image'
import { resolveImageIdsFromFilter } from '@main/utils/queryHelper'
import { BrowserWindow } from 'electron'

export default async function deleteImagesHandler(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  imageIdsOrFilter: number | number[] | { filter: SearchFilter },
): Promise<void> {
  const { db: database } = await getAndInitConfig(folderPath)
  const rootPath = folderPath
  const imageRepo = new ImageRepository(database, rootPath)

  let ids: number[]
  if (
    imageIdsOrFilter &&
    typeof imageIdsOrFilter === 'object' &&
    !Array.isArray(imageIdsOrFilter) &&
    'filter' in imageIdsOrFilter
  ) {
    ids = await resolveImageIdsFromFilter(folderPath, imageIdsOrFilter.filter)
  } else {
    ids = Array.isArray(imageIdsOrFilter)
      ? imageIdsOrFilter
      : typeof imageIdsOrFilter === 'number'
        ? [imageIdsOrFilter]
        : []
  }
  const deletedImages: { id: number; filePath: string }[] = []

  for (const id of ids) {
    const image = imageRepo.getImageById(id)
    if (!image) continue

    // Move to trash
    try {
      await deleteFileToTrash(image.filePath)
    } catch (err: unknown) {
      console.error(`Failed to move file to trash: ${image.filePath}`, err)
      throw new Error(
        `Failed to trash file: ${image.fileName}. ${(err as Error).message}`,
      )
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

  // Focus window after dialog dismissal to prevent focus/input freeze issues on Linux
  try {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window && !window.isDestroyed()) {
      window.blur()
      window.focus()
    }
  } catch (focusErr) {
    console.error('Failed to refocus window:', focusErr)
  }
}
