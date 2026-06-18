import { ipcMain } from 'electron'
import { getAllHandlers } from './getAll'
import { addFolderHandler, renameFolderHandler, deleteFolderHandler, customizeFolderHandler } from './manage'

export function registerFoldersHandlers() {
  ipcMain.handle('folders:get-all', getAllHandlers)
  ipcMain.handle('folders:add', addFolderHandler)
  ipcMain.handle('folders:rename', renameFolderHandler)
  ipcMain.handle('folders:delete', deleteFolderHandler)
  ipcMain.handle('folders:customize', customizeFolderHandler)
}
