import { ipcMain } from 'electron'
import addHandler from './add'
import getAllHandler from './getAll'
import getBySearchHandler from './getBySearch'
import removeHandler from './remove'

export function registerTagsHandlers() {
  ipcMain.handle('tags:add', addHandler)
  ipcMain.handle('tags:remove', removeHandler)
  ipcMain.handle('tags:get-all', getAllHandler)
  ipcMain.handle('tags:get-by-search', getBySearchHandler)
}
