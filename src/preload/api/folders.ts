import { FolderModel } from '@main/types/models.shared'
import { ipcRenderer } from 'electron'

const foldersApi = {
  getAll: (folderPath: string): Promise<FolderModel[]> =>
    ipcRenderer.invoke('folders:get-all', folderPath),
}

export default foldersApi
