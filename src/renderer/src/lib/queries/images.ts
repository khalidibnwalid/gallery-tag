import { useFolder } from '@/components/providers/FolderProvider'
import { ImageUpdatePayload } from '@main/types/api.shared'
import {
  QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { ImageData } from '../types/image'
import QUERIES from './constants'

// don't want two of the same subscriptions active at once
let globalSubscriptionCount = 0
let globalImageUpdateUnsubscribe: (() => void) | null = null

function subscribeToImageUpdates(
  queryClient: QueryClient,
  folderPath: string,
  isInfinite: boolean = false,
) {
  if (!window.api || !window.api.onImageUpdate) return

  // create subscriptions if none exist
  if (globalSubscriptionCount++ === 0) {
    globalImageUpdateUnsubscribe = window.api.onImageUpdate(
      ({ images }: ImageUpdatePayload) => {
        images.forEach(image => {
          if (isInfinite) {
            queryClient.setQueryData<{
              pages: ImageData[][]
              pageParams: unknown[]
            }>(QUERIES.IMAGES_PAGINATED(folderPath), oldData => {
              if (!oldData) return oldData
              return {
                ...oldData,
                pages: oldData.pages.map(page =>
                  page.map(old =>
                    image?.filePath === old.filePath || image?.id === old.id
                      ? { ...old, ...image }
                      : old,
                  ),
                ),
              }
            })
          } else {
            queryClient.setQueryData<ImageData[]>(
              QUERIES.IMAGES(folderPath),
              oldData => {
                if (!oldData) return oldData
                return oldData.map(old =>
                  image?.filePath === old.filePath || image?.id === old.id
                    ? { ...old, ...image }
                    : old,
                )
              },
            )
          }
        })
      },
    )
  }

  return () => {
    if (--globalSubscriptionCount === 0) {
      globalImageUpdateUnsubscribe?.()
      globalImageUpdateUnsubscribe = null
    }
  }
}

export default function useImages(folderPath?: string) {
  const { folderPath: contextFolderPath } = useFolder()
  folderPath ||= contextFolderPath || ''

  const queryClient = useQueryClient()

  // Subscribe to image updates
  useEffect(() => {
    const unsubscribe = subscribeToImageUpdates(queryClient, folderPath, false)
    return () => {
      unsubscribe?.()
    }
  }, [folderPath, queryClient])

  return useQuery<ImageData[]>({
    queryKey: QUERIES.IMAGES(folderPath),
    queryFn: async () => {
      if (!window.api || !window.api.openFolderDialog) {
        throw new Error('API not available')
      }
      const imageFiles = await window.api.getImageFiles(folderPath)
      return imageFiles
    },
    staleTime: Infinity,
    enabled: !!folderPath,
  })
}

export function useInfiniteImages(folderPath?: string, pageSize: number = 50) {
  const { folderPath: contextFolderPath } = useFolder()
  folderPath ||= contextFolderPath || ''

  const queryClient = useQueryClient()

  // Subscribe to image updates
  useEffect(() => {
    const unsubscribe = subscribeToImageUpdates(queryClient, folderPath, true)
    return () => {
      unsubscribe?.()
    }
  }, [folderPath, queryClient])

  return useInfiniteQuery<ImageData[], Error>({
    queryKey: QUERIES.IMAGES_PAGINATED(folderPath),
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!window.api || !window.api.getImageFilesPaginated) {
        throw new Error('API not available')
      }
      const result = await window.api.getImageFilesPaginated(
        folderPath,
        pageParam as number,
        pageSize,
      )
      return result.data
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage?.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    staleTime: Infinity,
    enabled: !!folderPath,
  })
}

export function useInfiniteImagesSearch(
  query: string,
  pageSize: number = 50,
  enabled: boolean = true,
) {
  return useInfiniteQuery<ImageData[], Error>({
    queryKey: QUERIES.IMAGES_SEARCH(query),
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!window.api || !window.api.getItemsBySearchPaginated) {
        throw new Error('Search API not available')
      }
      const result = await window.api.getItemsBySearchPaginated(
        query,
        pageParam as number,
        pageSize,
      )
      return result.data
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage?.length < pageSize) return undefined

      return allPages.length * pageSize
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: enabled && !!query.trim(),
  })
}

export function useImagesSearchQuery(query: string, enabled: boolean = true) {
  return useQuery<ImageData[]>({
    queryKey: QUERIES.IMAGES_SEARCH(query),
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
