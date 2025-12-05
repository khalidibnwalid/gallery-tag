import { electronAPI } from '@electron-toolkit/preload'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { EVENTS } from '@main/types/constants.shared'
import { TagModel } from '@main/types/models.shared'
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// Custom APIs for renderer
const api = {
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),

  getImageFiles: (folderPath: string) =>
    ipcRenderer.invoke('get-image-files', folderPath),
  onImageUpdate: (callback: (data: ImageUpdatePayload) => void) => {
    const sub = (_: IpcRendererEvent, data: { payload: ImageUpdatePayload }) =>
      callback(data.payload)
    ipcRenderer.on(EVENTS.UPDATE_IMAGE, sub)
    return () => ipcRenderer.removeListener(EVENTS.UPDATE_IMAGE, sub)
  },
  getItemsBySearch: (query: string) =>
    ipcRenderer.invoke('get-items-by-search', query),

  addTags(tags: TagModel[], imagesIds: number[]): Promise<TagModel[]> {
    return ipcRenderer.invoke('add-tags', { tags, imagesIds })
  },

  getAllTags(): Promise<TagModel[]> {
    return ipcRenderer.invoke('get-all-tags')
  },

  getTagsBySearch(query: string): Promise<TagModel[]> {
    return ipcRenderer.invoke('get-tags-by-search', query)
  },

  closeApp: () => ipcRenderer.invoke('close-app'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
