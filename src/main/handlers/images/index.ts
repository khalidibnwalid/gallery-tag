import { ipcMain } from 'electron'
import getAllHandler, { getPaginatedHandler } from './getAll'
import getBySearchHandler, { getBySearchPaginatedHandler } from './getBySearch'

export function registerImagesHandlers() {
  ipcMain.handle('images:get-all', getAllHandler)
  ipcMain.handle('images:get-paginated', getPaginatedHandler)
  ipcMain.handle('images:get-by-search', getBySearchHandler)
  ipcMain.handle('images:get-by-search-paginated', getBySearchPaginatedHandler)
}
