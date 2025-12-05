import { useQuery } from '@tanstack/react-query'
import { ImageData } from '../types/image'
import QUERIES from './constants'

export function useSearchQuery(query: string, enabled: boolean = true) {
  return useQuery<ImageData[]>({
    queryKey: QUERIES.SEARCH(query),
    queryFn: async () => {
      if (!window.api || !window.api.getItemsBySearch) {
        throw new Error('Search API not available')
      }
      const results = await window.api.getItemsBySearch(query)
      return results
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: enabled && !!query.trim(),
  })
}
