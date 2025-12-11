import { useFolder } from '@/components/providers/FolderProvider'
import { ImageUpdatePayload } from '@main/types/api.shared'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { ImageData } from '../types/image'
import QUERIES from './constants'

export default function useImages(folderPath?: string) {
  const { folderPath: contextFolderPath } = useFolder()
  folderPath ||= contextFolderPath || ''

  const queryClient = useQueryClient()
  useEffect(() => {
    if (!window.api || !window.api.onImageUpdate) {
      return
    }
    const unsubscribe = window.api.onImageUpdate(
      ({ images }: ImageUpdatePayload) => {
        images.forEach(image => {
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
        })
      },
    )
    return () => {
      unsubscribe()
    }
  }, [folderPath])

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
  useEffect(() => {
    if (!window.api || !window.api.onImageUpdate) {
      return
    }
    const unsubscribe = window.api.onImageUpdate(
      ({ images }: ImageUpdatePayload) => {
        images.forEach(image => {
          queryClient.setQueryData<{
            pages: ImageData[][]
            pageParams: unknown[]
          }>(QUERIES.IMAGES(folderPath), oldData => {
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
        })
      },
    )
    return () => {
      unsubscribe()
    }
  }, [folderPath])

  return useInfiniteQuery<ImageData[], Error>({
    queryKey: QUERIES.IMAGES(folderPath),
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
