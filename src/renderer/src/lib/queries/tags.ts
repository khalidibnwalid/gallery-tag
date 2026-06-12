import { useFolder } from '@/components/providers/FolderProvider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageData } from '../types/image'
import { TagData } from '../types/tag'
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

  queryClient.setQueriesData(
    { queryKey: ['images'] },
    (oldData: any) => {
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
          const updatedTags = currentTags.filter(tagName => !tagsToRemove.has(tagName))
          newTagsString = updatedTags.join(', ') || undefined
        }

        return {
          ...image,
          tags: newTagsString,
        }
      }

      if (typeof oldData === 'object' && 'pages' in oldData && Array.isArray(oldData.pages)) {
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => {
            if (Array.isArray(page)) {
              return page.map(updateImage)
            } else if (page && typeof page === 'object' && Array.isArray(page.data)) {
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
    },
  )
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
    onSuccess: (data, { tags, imageIds }) => {
      updateTagsInQueryCache(queryClient, imageIds, tags, 'add')
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SEARCH() })
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
      onSuccess?.({ tagIds, imageIds })
    },
  })
}
