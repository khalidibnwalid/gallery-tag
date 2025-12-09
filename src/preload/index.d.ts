import { ElectronAPI } from '@electron-toolkit/preload'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { ImageModel, TagModel, PaginatedResult } from '@main/types/models.shared'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFolderDialog: () => Promise<string | null>
      revealInFileExplorer: (filePath: string) => void
      openPathInDefaultApp: (filePath: string) => void

      getImageFiles: (
        folderPath: string,
      ) => Promise<(ImageModel & { tags?: string })[]>
      getImageFilesPaginated: (
        folderPath: string,
        offset?: number,
        size?: number,
      ) => Promise<PaginatedResult<ImageModel & { tags?: string }>>
      getItemsBySearch: (
        query: string,
      ) => Promise<(ImageModel & { tags?: string })[]>
      getItemsBySearchPaginated: (
        query: string,
        offset?: number,
        size?: number,
      ) => Promise<PaginatedResult<ImageModel & { tags?: string }>>
      onImageUpdate: (
        callback: ({ images }: ImageUpdatePayload) => void,
      ) => () => void

      addTags: (
        tags: (TagModel | Pick<TagModel, 'name' | 'color'>)[],
        imagesIds: number[],
      ) => Promise<TagModel[]>
      removeTags: (tagIds: number[], imagesIds: number[]) => Promise<void>

      getAllTags: () => Promise<TagModel[]>
      getTagsBySearch: (query: string) => Promise<TagModel[]>

      closeApp: () => void
    }
  }
}
