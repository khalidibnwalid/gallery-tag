import { ImageUpdatePayload, SearchFilter } from '@main/types/api.shared'
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
    filter?: SearchFilter,
  ): Promise<PaginatedResult<ImageModel & { tags?: string }>> =>
    ipcRenderer.invoke(
      'images:get-paginated',
      folderPath,
      offset,
      size,
      filter,
    ),
  onUpdate: (callback: (data: ImageUpdatePayload) => void) => {
    const sub = (_: IpcRendererEvent, data: { payload: ImageUpdatePayload }) =>
      callback(data.payload)
    ipcRenderer.on(EVENTS.UPDATE_IMAGE, sub)
    return () => ipcRenderer.removeListener(EVENTS.UPDATE_IMAGE, sub)
  },
  moveTo: (
    folderPath: string,
    imageId: number | number[],
    targetFolderPath: string,
  ): Promise<ImageModel | ImageModel[]> =>
    ipcRenderer.invoke('images:move-to', folderPath, imageId, targetFolderPath),
  rename: (
    folderPath: string,
    imageId: number,
    newName: string,
  ): Promise<ImageModel> =>
    ipcRenderer.invoke('images:rename', folderPath, imageId, newName),
  delete: (
    folderPath: string,
    imageIdOrFilter: number | number[] | { filter: SearchFilter },
  ): Promise<void> =>
    ipcRenderer.invoke('images:delete', folderPath, imageIdOrFilter),
}

export default imagesApi
