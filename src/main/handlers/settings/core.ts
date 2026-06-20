import { ipcMain } from 'electron'
import { AppSettingModel, SettingValue } from '@main/types/models.shared'
import { getSettingsRepo } from './utils'

export function registerCoreHandlers() {
  ipcMain.handle('settings:get-all', async (_event, folderPath: string): Promise<AppSettingModel[]> => {
    try {
      const repo = getSettingsRepo(folderPath)
      return repo.getAllSettings()
    } catch (e) {
      console.error('Error getting settings:', e)
      throw e
    }
  })

  ipcMain.handle(
    'settings:get',
    async (_event, folderPath: string, key: string): Promise<AppSettingModel | undefined> => {
      try {
        const repo = getSettingsRepo(folderPath)
        return repo.getSetting(key)
      } catch (e) {
        console.error(`Error getting setting ${key}:`, e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:get-value',
    async (_event, folderPath: string, key: string): Promise<SettingValue | undefined> => {
      try {
        const repo = getSettingsRepo(folderPath)
        return repo.getParsedValue(key)
      } catch (e) {
        console.error(`Error getting setting value ${key}:`, e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:set',
    async (
      _event,
      folderPath: string,
      key: string,
      value: SettingValue,
      valueType:
        | 'string'
        | 'number'
        | 'boolean'
        | 'json'
        | 'json_array' = 'string',
    ): Promise<void> => {
      try {
        const repo = getSettingsRepo(folderPath)
        repo.setSetting(key, value, valueType as any)
      } catch (e) {
        console.error(`Error setting setting ${key}:`, e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:delete',
    async (_event, folderPath: string, key: string): Promise<void> => {
      try {
        const repo = getSettingsRepo(folderPath)
        repo.deleteSetting(key)
      } catch (e) {
        console.error(`Error deleting setting ${key}:`, e)
        throw e
      }
    },
  )
}
