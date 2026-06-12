import { AppSettingModel, SettingValue } from '@main/types/models.shared'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import { db } from '@main/utils/repositories/db'
import { ipcMain } from 'electron'

function getSettingsRepo(): AppSettingsRepository {
  const connectedPaths = db.getConnectedPaths()
  if (connectedPaths.length === 0) {
    throw new Error(
      'No active database connection found. Please load a folder first.',
    )
  }
  const database = db.getDatabase(connectedPaths[0])
  return new AppSettingsRepository(database)
}

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get-all', async (): Promise<AppSettingModel[]> => {
    try {
      const repo = getSettingsRepo()
      return repo.getAllSettings()
    } catch (e) {
      console.error('Error getting settings:', e)
      throw e
    }
  })

  ipcMain.handle(
    'settings:get',
    async (_event, key: string): Promise<AppSettingModel | undefined> => {
      try {
        const repo = getSettingsRepo()
        return repo.getSetting(key)
      } catch (e) {
        console.error(`Error getting setting ${key}:`, e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:get-value',
    async (_event, key: string): Promise<SettingValue | undefined> => {
      try {
        const repo = getSettingsRepo()
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
        const repo = getSettingsRepo()
        repo.setSetting(key, value, valueType as any)
      } catch (e) {
        console.error(`Error setting setting ${key}:`, e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:delete',
    async (_event, key: string): Promise<void> => {
      try {
        const repo = getSettingsRepo()
        repo.deleteSetting(key)
      } catch (e) {
        console.error(`Error deleting setting ${key}:`, e)
        throw e
      }
    },
  )
}
