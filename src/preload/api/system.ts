import { ipcRenderer } from 'electron'

const systemApi = {
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  revealInFileExplorer: (filePath: string) =>
    ipcRenderer.invoke('reveal-in-file-explorer', filePath),
  openPathInDefaultApp: (filePath: string) =>
    ipcRenderer.invoke('open-path-in-default-app', filePath),
  closeApp: () => ipcRenderer.invoke('close-app'),
}

export default systemApi
