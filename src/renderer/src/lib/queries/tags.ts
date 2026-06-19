import { useFolder } from '@/components/providers/FolderProvider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageData } from '../types/image'
import { SuggestedTagData, TagData } from '../types/tag'
import QUERIES from './constants'

export function useTags() {
  return useQuery<TagData[]>({
    queryKey: QUERIES.TAGS(),
    queryFn: async () => {
      if (!window.api || !window.api.tags.getAll) {
        throw new Error('Tags API not available')
      }
      const tags = await window.api.tags.getAll()
      return tags
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useTagsSearchQuery(query: string, enabled: boolean = true) {
  return useQuery<TagData[]>({
    queryKey: QUERIES.TAGS_SEARCH(query),
    queryFn: async () => {
      if (!window.api || !window.api.tags.getBySearch) {
        throw new Error('Tag search API not available')
      }
      const tags = await window.api.tags.getBySearch(query)
      return tags
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: enabled && !!query.trim(),
  })
}

export function useSuggestedTagsQuery({
  imageId,
  currentTags = [],
  enabled = true,
}: {
  imageId?: number
  currentTags?: string[]
  enabled?: boolean
}) {
  return useQuery<SuggestedTagData[]>({
    queryKey: QUERIES.TAGS_SUGGESTIONS(imageId, currentTags),
    queryFn: async () => {
      if (!imageId) return []
      if (!window.api || !window.api.tags.getSuggestions) {
        throw new Error('Tag suggestions API not available')
      }

      return await window.api.tags.getSuggestions({
        imageId,
        neighborCount: 20,
        limit: 12,
        excludeTagNames: currentTags,
      })
    },
    staleTime: 0,
    gcTime: 0,
    enabled: enabled && !!imageId,
  })
}

export function useCreateTagMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      color,
    }: {
      name: string
      color?: string
    }): Promise<TagData[]> => {
      if (!window.api || !window.api.tags.add) {
        throw new Error('Add tags API not available')
      }

      const newTags = await window.api.tags.add([{ name, color }], [])
      return newTags
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SEARCH() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SUGGESTIONS() })
    },
  })
}

export function useRenameTagMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tagId,
      newName,
    }: {
      tagId: number
      newName: string
    }): Promise<TagData> => {
      if (!window.api || !window.api.tags.rename) {
        throw new Error('Rename tag API not available')
      }
      return await window.api.tags.rename(tagId, newName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SEARCH() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SUGGESTIONS() })
      queryClient.setQueriesData({ queryKey: ['images'] }, (oldData: any) => {
        if (!oldData) return oldData
        // Tag rename doesn't change tags on images directly; just invalidate
        return oldData
      })
    },
  })
}

export function useDeleteTagMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tagId }: { tagId: number }): Promise<void> => {
      if (!window.api || !window.api.tags.delete) {
        throw new Error('Delete tag API not available')
      }
      await window.api.tags.delete(tagId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SEARCH() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SUGGESTIONS() })
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
  })
}

function updateTagsInQueryCache(
  queryClient: any,
  imageIds: number[],
  tags: { name: string; color?: string }[],
  action: 'add' | 'remove',
) {
  const ids = new Set(imageIds)

  queryClient.setQueriesData({ queryKey: ['images'] }, (oldData: any) => {
    if (!oldData) return oldData

    const updateImage = (image: ImageData) => {
      if (!ids.has(image.id)) return image

      const currentTags = image.tags
        ? image.tags.split(',').map(t => t.trim())
        : []

      let newTagsString = image.tags

      if (action === 'add') {
        const newTagsToAppend = tags
          .filter(tag => !currentTags.includes(tag.name))
          .map(tag => tag.name)
          .filter(Boolean)
          .join(', ')

        newTagsString = image.tags
          ? newTagsToAppend
            ? image.tags + ', ' + newTagsToAppend
            : image.tags
          : newTagsToAppend || image.tags
      } else {
        const tagsToRemove = new Set(tags.map(t => t.name))
        const updatedTags = currentTags.filter(
          tagName => !tagsToRemove.has(tagName),
        )
        newTagsString = updatedTags.join(', ') || undefined
      }

      return {
        ...image,
        tags: newTagsString,
      }
    }

    if (
      typeof oldData === 'object' &&
      'pages' in oldData &&
      Array.isArray(oldData.pages)
    ) {
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => {
          if (Array.isArray(page)) {
            return page.map(updateImage)
          } else if (
            page &&
            typeof page === 'object' &&
            Array.isArray(page.data)
          ) {
            return {
              ...page,
              data: page.data.map(updateImage),
            }
          }
          return page
        }),
      }
    } else if (Array.isArray(oldData)) {
      return oldData.map(updateImage)
    }

    return oldData
  })
}

export function useAddTagsToImageMutation({
  onSuccess,
}: { onSuccess?: (tags: TagData[]) => void } = {}) {
  const queryClient = useQueryClient()
  const { folderPath } = useFolder()

  if (!folderPath) {
    throw new Error('Folder path is not available')
  }

  return useMutation({
    mutationFn: async ({
      tags,
      imageIds,
    }: {
      tags: (TagData | Pick<TagData, 'name' | 'color'>)[]
      imageIds: number[]
    }): Promise<TagData[]> => {
      if (!window.api || !window.api.tags.add) {
        throw new Error('Add tags API not available')
      }

      const result = await window.api.tags.add(tags, imageIds)
      return result
    },
    onSuccess: (data, { imageIds }) => {
      updateTagsInQueryCache(queryClient, imageIds, data, 'add')
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SEARCH() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SUGGESTIONS() })
      queryClient.invalidateQueries({ queryKey: ['images'] })
      onSuccess?.(data)
    },
  })
}

export function useRemoveTagsFromImageMutation({
  onSuccess,
}: {
  onSuccess?: ({
    tagIds,
    imageIds,
  }: {
    tagIds: TagData['id'][]
    imageIds: ImageData['id'][]
  }) => void
} = {}) {
  const queryClient = useQueryClient()
  const { folderPath, tagsQuery } = useFolder()

  if (!folderPath) {
    throw new Error('Folder path is not available')
  }

  return useMutation({
    mutationFn: async ({
      tagIds,
      imageIds,
    }: {
      tagIds: number[]
      imageIds: number[]
    }): Promise<void> => {
      if (!window.api || !window.api.tags.remove) {
        throw new Error('Remove tags API not available')
      }

      await window.api.tags.remove(tagIds, imageIds)
    },
    onSuccess: (_, { tagIds, imageIds }) => {
      const tagIdsSet = new Set(tagIds)
      const tagsData =
        tagsQuery.data?.filter(tag => tagIdsSet.has(tag.id)) || []

      updateTagsInQueryCache(queryClient, imageIds, tagsData, 'remove')
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SUGGESTIONS() })
      onSuccess?.({ tagIds, imageIds })
    },
  })
}

export function useSetTagParentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tagId,
      parentId,
    }: {
      tagId: number
      parentId: number | null
    }): Promise<TagData> => {
      if (!window.api || !window.api.tags.setParent) {
        throw new Error('Set tag parent API not available')
      }
      return await window.api.tags.setParent(tagId, parentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SEARCH() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SUGGESTIONS() })
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
  })
}
