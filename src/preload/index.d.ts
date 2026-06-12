import { ImageUpdatePayload, SearchFilter } from '@main/types/api.shared'
import {
  FolderModel,
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
        openFileDialog: () => Promise<string | null>
        revealInFileExplorer: (filePath: string) => void
        openPathInDefaultApp: (filePath: string) => void
        closeApp: () => void
        saveTempFile: (base64Data: string, fileName?: string) => Promise<string>
      }

      images: {
        getAll: (folderPath: string) => Promise<{
          data: (ImageModel & { tags?: string })[]
          total: number
        }>
        getPaginated: (
          folderPath: string,
          offset?: number,
          size?: number,
          filter?: SearchFilter,
        ) => Promise<PaginatedResult<ImageModel & { tags?: string }>>
        onUpdate: (
          callback: ({ images }: ImageUpdatePayload) => void,
        ) => () => void
      }

      folders: {
        getAll: (folderPath: string) => Promise<FolderModel[]>
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
