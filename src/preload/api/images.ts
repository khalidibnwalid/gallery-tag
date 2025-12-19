import { ImageUpdatePayload } from '@main/types/api.shared'
import { EVENTS } from '@main/types/constants.shared'
import { ImageModel, PaginatedResult } from '@main/types/models.shared'
import { ipcRenderer, IpcRendererEvent } from 'electron'

const imagesApi = {
  getAll: (folderPath: string) =>
    ipcRenderer.invoke('images:get-all', folderPath),
  getPaginated: (
    folderPath: string,
    offset: number = 0,
    size: number = 50,
  ): Promise<PaginatedResult<ImageModel & { tags?: string }>> =>
    ipcRenderer.invoke('images:get-paginated', folderPath, offset, size),
  onUpdate: (callback: (data: ImageUpdatePayload) => void) => {
    const sub = (_: IpcRendererEvent, data: { payload: ImageUpdatePayload }) =>
      callback(data.payload)
    ipcRenderer.on(EVENTS.UPDATE_IMAGE, sub)
    return () => ipcRenderer.removeListener(EVENTS.UPDATE_IMAGE, sub)
  },
  getBySearch: (query: string) =>
    ipcRenderer.invoke('images:get-by-search', query),
  getBySearchPaginated: (
    query: string,
    offset: number = 0,
    size: number = 50,
  ): Promise<PaginatedResult<ImageModel & { tags?: string }>> =>
    ipcRenderer.invoke('images:get-by-search-paginated', query, offset, size),
}

export default imagesApi
