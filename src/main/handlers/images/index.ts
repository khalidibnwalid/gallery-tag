import { ipcMain } from 'electron'
import getAllHandler, { getPaginatedHandler } from './getAll'

export function registerImagesHandlers() {
  ipcMain.handle('images:get-all', getAllHandler)
  ipcMain.handle('images:get-paginated', getPaginatedHandler)
}
