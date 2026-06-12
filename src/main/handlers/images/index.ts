import { ipcMain } from 'electron'
import getAllHandler, { getPaginatedHandler } from './getAll'
import moveToHandler from './moveTo'
import renameHandler from './rename'
import deleteHandler from './delete'

export function registerImagesHandlers() {
  ipcMain.handle('images:get-all', getAllHandler)
  ipcMain.handle('images:get-paginated', getPaginatedHandler)
  ipcMain.handle('images:move-to', moveToHandler)
  ipcMain.handle('images:rename', renameHandler)
  ipcMain.handle('images:delete', deleteHandler)
}
