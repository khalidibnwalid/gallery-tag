import {
  ImageUpdatePayload,
  SearchFilter,
  SuggestedTag,
} from '@main/types/api.shared'
import {
  FolderModel,
  ImageModel,
  Notifier,
  PaginatedResult,
  TagModel,
  AppSettingModel,
  SettingValue,
  ValueTypeMap,
  InferValueTypeKey,
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
        moveTo: (
          imageId: number | number[],
          targetFolderPath: string,
        ) => Promise<ImageModel | ImageModel[]>
        rename: (imageId: number, newName: string) => Promise<ImageModel>
        delete: (imageId: number | number[]) => Promise<void>
      }

      folders: {
        getAll: (folderPath: string) => Promise<FolderModel[]>
        add: (
          parentPath: string,
          folderName: string,
        ) => Promise<{
          id: number
          name: string
          path: string
          parentId: number | null
        }>
        rename: (
          folderId: number,
          newName: string,
        ) => Promise<{ id: number; name: string; path: string }>
        delete: (folderId: number) => Promise<void>
        customize: (
          folderId: number,
          icon: string | null,
          color: string | null,
        ) => Promise<void>
      }

      tags: {
        add: (
          tags: (TagModel | Pick<TagModel, 'name' | 'color'>)[],
          imagesIds: number[],
        ) => Promise<TagModel[]>
        remove: (tagIds: number[], imagesIds: number[]) => Promise<void>
        rename: (tagId: number, newName: string) => Promise<TagModel>
        delete: (tagId: number) => Promise<void>
        getAll: () => Promise<TagModel[]>
        getBySearch: (query: string) => Promise<TagModel[]>
        getSuggestions: ({
          imageId,
          limit,
          neighborCount,
          excludeTagNames,
        }: {
          imageId: number
          limit?: number
          neighborCount?: number
          excludeTagNames?: string[]
        }) => Promise<SuggestedTag[]>
      }

      general: {
        onNotify: (
          callback: (notifier: Notifier<unknown>) => void,
        ) => () => void
      }

      settings: {
        getAll: () => Promise<AppSettingModel[]>
        get: (key: string) => Promise<AppSettingModel | undefined>
        getValue<T extends SettingValue = SettingValue>(
          key: string,
        ): Promise<T | undefined>
        set<T extends SettingValue>(
          key: string,
          value: T,
          valueType?: InferValueTypeKey<T>,
        ): Promise<void>
        delete: (key: string) => Promise<void>
        regenerateThumbnails: (folderPath: string) => Promise<number>
        reindexImagesClip: (folderPath: string) => Promise<number>
      }
    }
  }
}
