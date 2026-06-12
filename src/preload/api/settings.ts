import { AppSettingModel, SettingValue, InferValueTypeKey } from '@main/types/models.shared'
import { ipcRenderer } from 'electron'

export interface SettingsApi {
  getAll(): Promise<AppSettingModel[]>
  get(key: string): Promise<AppSettingModel | undefined>
  getValue<T extends SettingValue = SettingValue>(key: string): Promise<T | undefined>
  set<T extends SettingValue>(
    key: string,
    value: T,
    valueType?: InferValueTypeKey<T>,
  ): Promise<void>
  delete(key: string): Promise<void>
}

const settingsApi: SettingsApi = {
  getAll(): Promise<AppSettingModel[]> {
    return ipcRenderer.invoke('settings:get-all')
  },

  get(key: string): Promise<AppSettingModel | undefined> {
    return ipcRenderer.invoke('settings:get', key)
  },

  getValue(key: string): Promise<any> {
    return ipcRenderer.invoke('settings:get-value', key)
  },

  set(
    key: string,
    value: any,
    valueType: any = 'string',
  ): Promise<void> {
    return ipcRenderer.invoke('settings:set', key, value, valueType)
  },

  delete(key: string): Promise<void> {
    return ipcRenderer.invoke('settings:delete', key)
  },
}

export default settingsApi
