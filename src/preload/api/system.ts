import { ipcRenderer } from 'electron'

const systemApi = {
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  revealInFileExplorer: (filePath: string) =>
    ipcRenderer.invoke('reveal-in-file-explorer', filePath),
  openPathInDefaultApp: (filePath: string) =>
    ipcRenderer.invoke('open-path-in-default-app', filePath),
  closeApp: () => ipcRenderer.invoke('close-app'),
  saveTempFile: (base64Data: string, fileName?: string) =>
    ipcRenderer.invoke('save-temp-file', base64Data, fileName),
}

export default systemApi
