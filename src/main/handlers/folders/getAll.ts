import { FolderModel } from '@main/types/models.shared'
import { getAndInitConfig } from '@main/utils/config'
import { getAllFolders } from '@main/utils/db/Folder'

export async function getAllHandlers(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<FolderModel[]> {
  try {
    if (!folderPath) throw new Error('folderPath is required')
    const { db: database } = await getAndInitConfig(folderPath)
    return getAllFolders(database)
  } catch (error) {
    console.error('Error getting folders:', error)
    return []
  }
}
