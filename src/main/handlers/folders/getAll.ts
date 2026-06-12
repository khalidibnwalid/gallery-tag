import { FolderModel } from '@main/types/models.shared'
import { getAndInitConfig } from '@main/utils/files/config'
import { FolderRepository } from '@main/utils/repositories/Folder'

export async function getAllHandlers(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<FolderModel[]> {
  try {
    if (!folderPath) throw new Error('folderPath is required')
    const { db: database } = await getAndInitConfig(folderPath)
    const folderRepo = new FolderRepository(database, folderPath)
    return folderRepo.getAllFolders()
  } catch (error) {
    console.error('Error getting folders:', error)
    return []
  }
}
