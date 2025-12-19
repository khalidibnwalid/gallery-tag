import { ipcMain } from 'electron'
import closeAppHandler from './closeApp'
import openFolderDialogHandler from './openFolderDialog'
import openPathInDefaultAppHandler from './openPathInDefaultApp'
import revealInFileExplorerHandler from './revealInFileExplorer'

export function registerSystemHandlers() {
  ipcMain.handle('open-folder-dialog', openFolderDialogHandler)
  ipcMain.handle('reveal-in-file-explorer', revealInFileExplorerHandler)
  ipcMain.handle('open-path-in-default-app', openPathInDefaultAppHandler)
  ipcMain.handle('close-app', closeAppHandler)
}
