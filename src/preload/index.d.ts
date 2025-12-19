import { ElectronAPI } from '@electron-toolkit/preload'
import { ImageUpdatePayload } from '@main/types/api.shared'
import {
  ImageModel,
  Notifier,
  PaginatedResult,
  TagModel,
} from '@main/types/models.shared'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      system: {
        openFolderDialog: () => Promise<string | null>
        revealInFileExplorer: (filePath: string) => void
        openPathInDefaultApp: (filePath: string) => void
        closeApp: () => void
      }

      images: {
        getAll: (
          folderPath: string,
        ) => Promise<(ImageModel & { tags?: string })[]>
        getPaginated: (
          folderPath: string,
          offset?: number,
          size?: number,
        ) => Promise<PaginatedResult<ImageModel & { tags?: string }>>
        getBySearch: (
          query: string,
        ) => Promise<(ImageModel & { tags?: string })[]>
        getBySearchPaginated: (
          query: string,
          offset?: number,
          size?: number,
        ) => Promise<PaginatedResult<ImageModel & { tags?: string }>>
        onUpdate: (
          callback: ({ images }: ImageUpdatePayload) => void,
        ) => () => void
      }

      tags: {
        add: (
          tags: (TagModel | Pick<TagModel, 'name' | 'color'>)[],
          imagesIds: number[],
        ) => Promise<TagModel[]>
        remove: (tagIds: number[], imagesIds: number[]) => Promise<void>
        getAll: () => Promise<TagModel[]>
        getBySearch: (query: string) => Promise<TagModel[]>
      }

      general: {
        onNotify: (
          callback: (notifier: Notifier<unknown>) => void,
        ) => () => void
      }
    }
  }
}
