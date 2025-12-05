import { useFolder } from '@/components/providers/FolderProvider'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ImageData } from '../types/image'
import QUERIES from './constants'

// TODO: pagination or lazy loading for folders larger than a threshold
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
