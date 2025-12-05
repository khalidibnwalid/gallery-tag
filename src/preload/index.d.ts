import { ElectronAPI } from '@electron-toolkit/preload'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { ImageModel, TagModel } from '@main/types/models.shared'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFolderDialog: () => Promise<string | null>

      getImageFiles: (folderPath: string) => Promise<ImageModel[]>
      getItemsBySearch: (query: string) => Promise<ImageModel[]>
      onImageUpdate: (
        callback: ({ images }: ImageUpdatePayload) => void,
      ) => () => void

      addTags: (tags: TagModel[], imagesIds: number[]) => Promise<TagModel[]>

      getAllTags: () => Promise<TagModel[]>

      closeApp: () => void
    }
  }
}
