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
          folderPath: string,
          imageId: number | number[],
          targetFolderPath: string,
        ) => Promise<ImageModel | ImageModel[]>
        rename: (
          folderPath: string,
          imageId: number,
          newName: string,
        ) => Promise<ImageModel>
        delete: (
          folderPath: string,
          imageIdOrFilter: number | number[] | { filter: SearchFilter },
        ) => Promise<void>
      }

      folders: {
        getAll: (folderPath: string) => Promise<FolderModel[]>
        add: (
          folderPath: string,
          parentPath: string,
          folderName: string,
        ) => Promise<{
          id: number
          name: string
          path: string
          parentId: number | null
        }>
        rename: (
          folderPath: string,
          folderId: number,
          newName: string,
        ) => Promise<{ id: number; name: string; path: string }>
        delete: (folderPath: string, folderId: number) => Promise<void>
        customize: (
          folderPath: string,
          folderId: number,
          icon: string | null,
          color: string | null,
        ) => Promise<void>
        isNew: (folderPath: string) => Promise<boolean>
        initWithSettings: (
          folderPath: string,
          settings: {
            aiEnabled: boolean
            clipModel: string
            thumbnailQuality: number | null
          },
        ) => Promise<void>
      }

      tags: {
        add: (
          folderPath: string,
          tags: (TagModel | Pick<TagModel, 'name' | 'color'>)[],
          imagesIds?: number[],
          filter?: SearchFilter,
        ) => Promise<TagModel[]>
        remove: (
          folderPath: string,
          tagIds: number[],
          imagesIds?: number[],
          filter?: SearchFilter,
        ) => Promise<void>
        rename: (folderPath: string, tagId: number, newName: string) => Promise<TagModel>
        setParent: (folderPath: string, tagId: number, parentId: number | null) => Promise<TagModel>
        delete: (folderPath: string, tagId: number) => Promise<void>
        getAll: (folderPath: string) => Promise<TagModel[]>
        getBySearch: (folderPath: string, query: string) => Promise<TagModel[]>
        getSuggestions: (
          folderPath: string,
          params: {
            imageId: number
            limit?: number
            neighborCount?: number
            excludeTagNames?: string[]
          },
        ) => Promise<SuggestedTag[]>
      }

      general: {
        onNotify: (
          callback: (notifier: Notifier<unknown>) => void,
        ) => () => void
      }

      settings: {
        getAll: (folderPath: string) => Promise<AppSettingModel[]>
        get: (folderPath: string, key: string) => Promise<AppSettingModel | undefined>
        getValue<T  = SettingValue>(
          folderPath: string,
          key: string,
        ): Promise<T | undefined>
        set<T extends SettingValue>(
          folderPath: string,
          key: string,
          value: T,
          valueType?: InferValueTypeKey<T>,
        ): Promise<void>
        delete: (folderPath: string, key: string) => Promise<void>
        regenerateThumbnails: (folderPath: string) => Promise<number>
        reindexImagesClip: (folderPath: string) => Promise<number>
        clearModelIndex: (modelId: string, folderPath: string) => Promise<void>
        deleteModel: (modelId: string, folderPath: string) => Promise<void>
        partialReindex: (
          folderPath: string,
        ) => Promise<{ isUnused: boolean; missingCount: number }>
        getIndexedModels: (folderPath: string) => Promise<string[]>
      }
    }
  }
}
