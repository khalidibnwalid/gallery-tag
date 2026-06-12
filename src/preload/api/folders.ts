import { FolderModel } from '@main/types/models.shared'
import { ipcRenderer } from 'electron'

const foldersApi = {
  getAll: (folderPath: string): Promise<FolderModel[]> =>
    ipcRenderer.invoke('folders:get-all', folderPath),
  add: (parentPath: string, folderName: string): Promise<{ id: number; name: string; path: string; parentId: number | null }> =>
    ipcRenderer.invoke('folders:add', parentPath, folderName),
  rename: (folderId: number, newName: string): Promise<{ id: number; name: string; path: string }> =>
    ipcRenderer.invoke('folders:rename', folderId, newName),
}

export default foldersApi
