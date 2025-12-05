import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    mutationFn: async (tagName: string): Promise<TagData[]> => {
      if (!window.api || !window.api.addTags) {
        throw new Error('Add tags API not available')
      }

      // Create tag without associating with any images (empty array)
      // The addTags function accepts tags without id for creation
      const tagToCreate = { name: tagName } as TagData
      const newTags = await window.api.addTags([tagToCreate], [])
      return newTags
    },
    onSuccess: () => {
      // Invalidate and refetch tags to get the updated list
      queryClient.invalidateQueries({ queryKey: QUERIES.TAGS() })
      queryClient.invalidateQueries({ queryKey: ['tag-search'] })
    },
  })
}
