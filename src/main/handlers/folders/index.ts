import { ipcMain } from 'electron'
import { getAllHandlers } from './getAll'

export function registerFoldersHandlers() {
  ipcMain.handle('folders:get-all', getAllHandlers)
}
