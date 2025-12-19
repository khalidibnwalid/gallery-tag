import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge } from 'electron'
import generalApi from './api/general'
import imagesApi from './api/images'
import systemApi from './api/system'
import tagsApi from './api/tags'

// Custom APIs for renderer
const api = {
  system: systemApi,
  images: imagesApi,
  tags: tagsApi,
  general: generalApi,
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
