import { TagModel } from '@main/types/models.shared'
import { SuggestedTag } from '@main/types/api.shared'
import { ipcRenderer } from 'electron'

const tagsApi = {
  add(folderPath: string, tags: TagModel[], imagesIds: number[]): Promise<TagModel[]> {
    return ipcRenderer.invoke('tags:add', folderPath, { tags, imagesIds })
  },

  remove(folderPath: string, tagIds: number[], imagesIds: number[]) {
    return ipcRenderer.invoke('tags:remove', folderPath, { tagIds, imagesIds })
  },

  rename(folderPath: string, tagId: number, newName: string): Promise<TagModel> {
    return ipcRenderer.invoke('tags:rename', folderPath, { tagId, newName })
  },

  setParent(folderPath: string, tagId: number, parentId: number | null): Promise<TagModel> {
    return ipcRenderer.invoke('tags:set-parent', folderPath, { tagId, parentId })
  },

  delete(folderPath: string, tagId: number): Promise<void> {
    return ipcRenderer.invoke('tags:delete', folderPath, { tagId })
  },

  getAll(folderPath: string): Promise<TagModel[]> {
    return ipcRenderer.invoke('tags:get-all', folderPath)
  },

  getBySearch(folderPath: string, query: string): Promise<TagModel[]> {
    return ipcRenderer.invoke('tags:get-by-search', folderPath, query)
  },

  getSuggestions(
    folderPath: string,
    {
      imageId,
      limit,
      neighborCount,
      excludeTagNames,
    }: {
      imageId: number
      limit?: number
      neighborCount?: number
      excludeTagNames?: string[]
    },
  ): Promise<SuggestedTag[]> {
    return ipcRenderer.invoke('tags:get-suggestions', folderPath, {
      imageId,
      limit,
      neighborCount,
      excludeTagNames,
    })
  },
}

export default tagsApi
