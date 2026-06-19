import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useIndexedModels() {
  return useQuery<string[]>({
    queryKey: ['settings', 'indexed-models'],
    queryFn: async () => {
      if (!window.api || !window.api.settings.getIndexedModels) {
        throw new Error('getIndexedModels API not available')
      }
      return await window.api.settings.getIndexedModels()
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useClearModelIndexMutation(folderPath: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (modelId: string) => {
      if (!window.api || !window.api.settings.clearModelIndex) {
        throw new Error('clearModelIndex API not available')
      }
      return await window.api.settings.clearModelIndex(modelId, folderPath)
    },
    onSuccess: (_, modelId) => {
      toast.success(`Cleared index for ${modelId.split('/').pop()}`)
      queryClient.invalidateQueries({ queryKey: ['settings', 'indexed-models'] })
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to clear model index')
    },
  })
}

export function useDeleteModelMutation(folderPath: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (modelId: string) => {
      if (!window.api || !window.api.settings.deleteModel) {
        throw new Error('deleteModel API not available')
      }
      return await window.api.settings.deleteModel(modelId, folderPath)
    },
    onSuccess: (_, modelId) => {
      toast.success(`Deleted model ${modelId.split('/').pop()}`)
      queryClient.invalidateQueries({ queryKey: ['settings', 'indexed-models'] })
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete model')
    },
  })
}

export function usePartialReindexMutation(folderPath: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!window.api || !window.api.settings.partialReindex) {
        throw new Error('partialReindex API not available')
      }
      return await window.api.settings.partialReindex(folderPath)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'indexed-models'] })
      queryClient.invalidateQueries({ queryKey: ['images'] })
      if (data.isUnused) {
        toast.info('This model has not been used before. Starting a full indexing scan in the background...')
      } else if (data.missingCount > 0) {
        toast.info(`Indexing ${data.missingCount} remaining images in the background...`)
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to start background indexing')
    },
  })
}

export function useReindexClipMutation(folderPath: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!window.api || !window.api.settings.reindexImagesClip) {
        throw new Error('reindexImagesClip API not available')
      }
      return await window.api.settings.reindexImagesClip(folderPath)
    },
    onSuccess: (cleared) => {
      toast.success(`Started AI re-indexing for ${cleared} images in the background.`)
      queryClient.invalidateQueries({ queryKey: ['settings', 'indexed-models'] })
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to trigger AI re-indexing')
    },
  })
}
