import { useFolder } from '@/components/providers/FolderProvider'
import { ImageUpdatePayload, SearchFilter } from '@main/types/api.shared'
import {
  QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { ImageData } from '../types/image'
import QUERIES from './constants'
import { toast } from 'sonner'

// don't want two of the same subscriptions active at once
let globalSubscriptionCount = 0
let globalImageUpdateUnsubscribe: (() => void) | null = null

function subscribeToImageUpdates(
  queryClient: QueryClient,
  folderPath: string,
  isInfinite: boolean = false,
) {
  if (!window.api || !window.api.images.onUpdate) return

  // create subscriptions if none exist
  if (globalSubscriptionCount++ === 0) {
    globalImageUpdateUnsubscribe = window.api.images.onUpdate(
      ({ images }: ImageUpdatePayload) => {
        images.forEach(image => {
          const filePath = image?.filePath
          if (!filePath) return

          const belongs = folderPath ? filePath.startsWith(folderPath) : true

          if (isInfinite) {
            queryClient.setQueriesData<{
              pages: ImageData[][]
              pageParams: unknown[]
            }>({ queryKey: QUERIES.IMAGES_PAGINATED(folderPath) }, oldData => {
              if (!oldData) return oldData

              if (!belongs) {
                return {
                  ...oldData,
                  pages: oldData.pages.map(page =>
                    page.filter(old => old.id !== image.id),
                  ),
                }
              }

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
                if (!belongs) {
                  return oldData.filter(old => old.id !== image.id)
                }
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
      if (!window.api || !window.api.system.openFolderDialog) {
        throw new Error('API not available')
      }
      const result = await window.api.images.getAll(folderPath)
      return result.data
    },
    staleTime: Infinity,
    enabled: !!folderPath,
  })
}

export function useInfiniteImages(
  folderPath?: string,
  pageSize: number = 50,
  filter?: SearchFilter,
) {
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

  return useInfiniteQuery<{ data: ImageData[]; total: number }, Error>({
    queryKey: QUERIES.IMAGES_PAGINATED(folderPath, filter),
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!window.api || !window.api.images.getPaginated) {
        throw new Error('API not available')
      }
      const result = await window.api.images.getPaginated(
        folderPath!,
        pageParam as number,
        pageSize,
        filter!,
      )
      return {
        data: result.data,
        total: result.pagination.total,
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage?.data.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    staleTime: Infinity,
    enabled: !!folderPath,
  })
}

export function useRenameImageMutation() {
  const { folderPath } = useFolder()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      imageId,
      newName,
    }: {
      imageId: number
      newName: string
    }) => {
      if (!window.api || !window.api.images.rename) {
        throw new Error('Images rename API not available')
      }
      return await window.api.images.rename(folderPath!, imageId, newName)
    },
    onSuccess: () => {
      toast.success('Image renamed successfully')
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to rename image')
    },
  })
}

export function useMoveImagesMutation() {
  const { folderPath } = useFolder()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      imageIds,
      targetFolderPath,
    }: {
      imageIds: number | number[]
      targetFolderPath: string
    }) => {
      if (!window.api || !window.api.images.moveTo) {
        throw new Error('Images move API not available')
      }
      return await window.api.images.moveTo(folderPath!, imageIds, targetFolderPath)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
  })
}

export function useDeleteImagesMutation() {
  const { folderPath } = useFolder()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: number | number[] | { filter: SearchFilter },
    ) => {
      if (!window.api || !window.api.images.delete) {
        throw new Error('Images delete API not available')
      }
      return await window.api.images.delete(folderPath!, payload)
    },
    onSuccess: () => {
      toast.success('Images deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete images')
    },
  })
}

export function useSimilarImagesQuery(
  filePath: string | null | undefined,
  folderPath: string | null | undefined,
) {
  return useQuery<ImageData[]>({
    queryKey: QUERIES.IMAGE_SIMILAR(filePath! || '', folderPath! || ''),
    queryFn: async () => {
      if (
        !window.api ||
        !window.api.images.getPaginated ||
        !folderPath ||
        !filePath
      ) {
        return []
      }
      const res = await window.api.images.getPaginated(folderPath, 0, 15, {
        aiSearchImage: filePath,
      })
      return res.data.filter(img => img.filePath !== filePath)
    },
    enabled: !!folderPath && !!filePath,
  })
}
