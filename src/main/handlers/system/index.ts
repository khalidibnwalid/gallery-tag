import { ipcMain } from 'electron'
import closeAppHandler from './closeApp'
import openFolderDialogHandler from './openFolderDialog'
import openFileDialogHandler from './openFileDialog'
import openPathInDefaultAppHandler from './openPathInDefaultApp'
import revealInFileExplorerHandler from './revealInFileExplorer'
import saveTempFileHandler from './saveTempFile'

export function registerSystemHandlers() {
  ipcMain.handle('open-folder-dialog', openFolderDialogHandler)
  ipcMain.handle('open-file-dialog', openFileDialogHandler)
  ipcMain.handle('reveal-in-file-explorer', revealInFileExplorerHandler)
  ipcMain.handle('open-path-in-default-app', openPathInDefaultAppHandler)
  ipcMain.handle('close-app', closeAppHandler)
  ipcMain.handle('save-temp-file', saveTempFileHandler)
}
