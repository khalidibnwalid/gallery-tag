import { useFolder } from '@/components/providers/FolderProvider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageData } from '../types/image'
import { TagData } from '../types/tag'
import QUERIES from './constants'

export function useTags() {
  return useQuery<TagData[]>({
    queryKey: QUERIES.TAGS(),
    queryFn: async () => {
      if (!window.api || !window.api.getAllTags) {
        throw new Error('Tags API not available')
      }
      const tags = await window.api.getAllTags()
      return tags
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useTagsSearchQuery(query: string, enabled: boolean = true) {
  return useQuery<TagData[]>({
    queryKey: QUERIES.TAGS_SEARCH(query),
    queryFn: async () => {
      if (!window.api || !window.api.getTagsBySearch) {
        throw new Error('Tag search API not available')
      }
      const tags = await window.api.getTagsBySearch(query)
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
      if (!window.api || !window.api.addTags) {
        throw new Error('Add tags API not available')
      }

      const newTags = await window.api.addTags([{ name, color }], [])
      return newTags
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS_SEARCH() })
    },
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
      if (!window.api || !window.api.addTags) {
        throw new Error('Add tags API not available')
      }

      const result = await window.api.addTags(tags, imageIds)
      return result
    },
    onSuccess: (data, { tags, imageIds }) => {
      queryClient.setQueryData<ImageData[]>(
        QUERIES.IMAGES(folderPath),
        oldData => {
          const ids = new Set(imageIds)
          if (!oldData) return []
          return oldData.map(image => {
            const currentTags = image.tags
              ? image.tags.split(',').map(t => t.trim())
              : []

            return ids.has(image.id)
              ? {
                  ...image,
                  tags: image.tags
                    ? image.tags +
                      ', ' +
                      tags
                        .filter(tag => !currentTags.includes(tag.name))
                        .map(tag => tag.name)
                        .join(', ')
                    : tags.map(tag => tag.name).join(', '),
                }
              : image
          })
        },
      )
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
      if (!window.api || !window.api.removeTags) {
        throw new Error('Remove tags API not available')
      }

      await window.api.removeTags(tagIds, imageIds)
    },
    onSuccess: (_, { tagIds, imageIds }) => {
      const imageIdsSet = new Set(imageIds)
      const tagIdsSet = new Set(tagIds)

      const tagsData =
        tagsQuery.data?.filter(tag => tagIdsSet.has(tag.id)) || []

      const tagsNamesSet = new Set<string>(tagsData.map(tag => tag.name))

      queryClient.setQueryData<{
        pages: ImageData[][]
        pageParams: unknown[]
      }>(QUERIES.IMAGES_PAGINATED(folderPath), oldData => {
        if (!oldData) return { pages: [], pageParams: [] }
        return {
          ...oldData,
          pages: oldData.pages.map(page =>
            page.map(image => {
              if (!imageIdsSet.has(image.id)) return image

              const currentTags = image.tags
                ? image.tags.split(',').map(t => t.trim())
                : []

              const updatedTags = currentTags.filter(
                tagName => !tagsNamesSet.has(tagName),
              )

              return {
                ...image,
                tags: updatedTags.join(', '),
              }
            }),
          ),
        }
      })

      queryClient.setQueryData<ImageData[]>(
        QUERIES.IMAGES(folderPath),
        oldData => {
          if (!oldData) return []
          return oldData.map(image => {
            if (!imageIdsSet.has(image.id)) return image

            const currentTags = image.tags
              ? image.tags.split(',').map(t => t.trim())
              : []

            const updatedTags = currentTags.filter(
              tagName => !tagsNamesSet.has(tagName),
            )

            return {
              ...image,
              tags: updatedTags.join(', '),
            }
          })
        },
      )
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      onSuccess?.({ tagIds, imageIds })
    },
  })
}
