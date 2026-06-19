import { ipcMain } from 'electron'
import addHandler from './add'
import deleteHandler from './delete'
import getAllHandler from './getAll'
import getBySearchHandler from './getBySearch'
import getSuggestionsHandler from './getSuggestions'
import removeHandler from './remove'
import renameHandler from './rename'
import setParentHandler from './setParent'

export function registerTagsHandlers() {
  ipcMain.handle('tags:add', addHandler)
  ipcMain.handle('tags:remove', removeHandler)
  ipcMain.handle('tags:delete', deleteHandler)
  ipcMain.handle('tags:rename', renameHandler)
  ipcMain.handle('tags:set-parent', setParentHandler)
  ipcMain.handle('tags:get-all', getAllHandler)
  ipcMain.handle('tags:get-by-search', getBySearchHandler)
  ipcMain.handle('tags:get-suggestions', getSuggestionsHandler)
}
