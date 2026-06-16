import { TagModel } from '@main/types/models.shared'
import { SuggestedTag } from '@main/types/api.shared'
import { ipcRenderer } from 'electron'

const tagsApi = {
  add(tags: TagModel[], imagesIds: number[]): Promise<TagModel[]> {
    return ipcRenderer.invoke('tags:add', { tags, imagesIds })
  },

  remove(tagIds: number[], imagesIds: number[]) {
    return ipcRenderer.invoke('tags:remove', { tagIds, imagesIds })
  },

  rename(tagId: number, newName: string): Promise<TagModel> {
    return ipcRenderer.invoke('tags:rename', { tagId, newName })
  },

  delete(tagId: number): Promise<void> {
    return ipcRenderer.invoke('tags:delete', { tagId })
  },

  getAll(): Promise<TagModel[]> {
    return ipcRenderer.invoke('tags:get-all')
  },

  getBySearch(query: string): Promise<TagModel[]> {
    return ipcRenderer.invoke('tags:get-by-search', query)
  },

  getSuggestions({
    imageId,
    limit,
    neighborCount,
    excludeTagNames,
  }: {
    imageId: number
    limit?: number
    neighborCount?: number
    excludeTagNames?: string[]
  }): Promise<SuggestedTag[]> {
    return ipcRenderer.invoke('tags:get-suggestions', {
      imageId,
      limit,
      neighborCount,
      excludeTagNames,
    })
  },
}

export default tagsApi
