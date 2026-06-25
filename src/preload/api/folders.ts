import { FolderModel } from '@main/types/models.shared'
import { ipcRenderer } from 'electron'

const foldersApi = {
  getAll: (folderPath: string): Promise<FolderModel[]> =>
    ipcRenderer.invoke('folders:get-all', folderPath),
  add: (
    folderPath: string,
    parentPath: string,
    folderName: string,
  ): Promise<{
    id: number
    name: string
    path: string
    parentId: number | null
  }> => ipcRenderer.invoke('folders:add', folderPath, parentPath, folderName),
  rename: (
    folderPath: string,
    folderId: number,
    newName: string,
  ): Promise<{ id: number; name: string; path: string }> =>
    ipcRenderer.invoke('folders:rename', folderPath, folderId, newName),
  delete: (folderPath: string, folderId: number): Promise<void> =>
    ipcRenderer.invoke('folders:delete', folderPath, folderId),
  customize: (
    folderPath: string,
    folderId: number,
    icon: string | null,
    color: string | null,
  ): Promise<void> =>
    ipcRenderer.invoke('folders:customize', folderPath, folderId, icon, color),
  isNew: (folderPath: string): Promise<boolean> =>
    ipcRenderer.invoke('folders:is-new', folderPath),
  initWithSettings: (
    folderPath: string,
    settings: {
      aiEnabled: boolean
      clipModel: string
      thumbnailQuality: number | null
    },
  ): Promise<void> =>
    ipcRenderer.invoke('folders:init-with-settings', folderPath, settings),
}

export default foldersApi
