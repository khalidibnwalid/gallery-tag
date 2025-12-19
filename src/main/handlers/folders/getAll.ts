import { FolderModel } from '@main/types/models.shared'
import { db } from '@main/utils/db/db'
import { getAllFolders } from '@main/utils/db/Folder'

export async function getAllHandlers(
  _event: Electron.IpcMainInvokeEvent,
): Promise<FolderModel[]> {
  try {
    const database = db.getFirstDatabase()
    if (!database) throw new Error('No active database connection found')
    return getAllFolders(database)
  } catch (error) {
    console.error('Error getting folders:', error)
    return []
  }
}
