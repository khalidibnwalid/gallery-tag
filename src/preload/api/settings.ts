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
  
  regenerateThumbnails(folderPath: string): Promise<number>
  reindexImagesClip(folderPath: string): Promise<number>
  clearModelIndex(modelId: string, folderPath: string): Promise<void>
  deleteModel(modelId: string, folderPath: string): Promise<void>
  partialReindex(folderPath: string): Promise<{ isUnused: boolean; missingCount: number }>
  getIndexedModels(): Promise<string[]>
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

  regenerateThumbnails(folderPath: string): Promise<number> {
    return ipcRenderer.invoke('settings:regenerate-thumbnails', folderPath)
  },

  reindexImagesClip(folderPath: string): Promise<number> {
    return ipcRenderer.invoke('settings:reindex-clip', folderPath)
  },

  clearModelIndex(modelId: string, folderPath: string): Promise<void> {
    return ipcRenderer.invoke('settings:clear-model-index', modelId, folderPath)
  },

  deleteModel(modelId: string, folderPath: string): Promise<void> {
    return ipcRenderer.invoke('settings:delete-model', modelId, folderPath)
  },

  partialReindex(folderPath: string): Promise<{ isUnused: boolean; missingCount: number }> {
    return ipcRenderer.invoke('settings:partial-reindex', folderPath)
  },

  getIndexedModels(): Promise<string[]> {
    return ipcRenderer.invoke('settings:get-indexed-models')
  },
}

export default settingsApi
