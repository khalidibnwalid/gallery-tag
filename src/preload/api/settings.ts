import {
  AppSettingModel,
  SettingValue,
  InferValueTypeKey,
} from '@main/types/models.shared'
import { ipcRenderer } from 'electron'

export interface SettingsApi {
  getAll(folderPath: string): Promise<AppSettingModel[]>
  get(folderPath: string, key: string): Promise<AppSettingModel | undefined>
  getValue<T extends SettingValue = SettingValue>(
    folderPath: string,
    key: string,
  ): Promise<T | undefined>
  set<T extends SettingValue>(
    folderPath: string,
    key: string,
    value: T,
    valueType?: InferValueTypeKey<T>,
  ): Promise<void>
  delete(folderPath: string, key: string): Promise<void>

  regenerateThumbnails(folderPath: string): Promise<number>
  reindexImagesClip(folderPath: string): Promise<number>
  clearModelIndex(modelId: string, folderPath: string): Promise<void>
  deleteModel(modelId: string, folderPath: string): Promise<void>
  partialReindex(
    folderPath: string,
  ): Promise<{ isUnused: boolean; missingCount: number }>
  getIndexedModels(folderPath: string): Promise<string[]>
}

const settingsApi: SettingsApi = {
  getAll(folderPath: string): Promise<AppSettingModel[]> {
    return ipcRenderer.invoke('settings:get-all', folderPath)
  },

  get(folderPath: string, key: string): Promise<AppSettingModel | undefined> {
    return ipcRenderer.invoke('settings:get', folderPath, key)
  },

  getValue(folderPath: string, key: string): Promise<any> {
    return ipcRenderer.invoke('settings:get-value', folderPath, key)
  },

  set(folderPath: string, key: string, value: any, valueType: any = 'string'): Promise<void> {
    return ipcRenderer.invoke('settings:set', folderPath, key, value, valueType)
  },

  delete(folderPath: string, key: string): Promise<void> {
    return ipcRenderer.invoke('settings:delete', folderPath, key)
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

  partialReindex(
    folderPath: string,
  ): Promise<{ isUnused: boolean; missingCount: number }> {
    return ipcRenderer.invoke('settings:partial-reindex', folderPath)
  },

  getIndexedModels(folderPath: string): Promise<string[]> {
    return ipcRenderer.invoke('settings:get-indexed-models', folderPath)
  },
}

export default settingsApi
