import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useFolder } from '@/components/providers/FolderProvider'

export function useIndexedModels() {
  const { folderPath } = useFolder()
  return useQuery<string[]>({
    queryKey: ['settings', 'indexed-models', folderPath],
    queryFn: async () => {
      if (!folderPath) return []
      if (!window.api || !window.api.settings.getIndexedModels) {
        throw new Error('getIndexedModels API not available')
      }
      return await window.api.settings.getIndexedModels(folderPath)
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: !!folderPath,
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
      queryClient.invalidateQueries({
        queryKey: ['settings', 'indexed-models'],
      })
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
      queryClient.invalidateQueries({
        queryKey: ['settings', 'indexed-models'],
      })
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
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ['settings', 'indexed-models'],
      })
      queryClient.invalidateQueries({ queryKey: ['images'] })
      if (data.isUnused) {
        toast.info(
          'This model has not been used before. Starting a full indexing scan in the background...',
        )
      } else if (data.missingCount > 0) {
        toast.info(
          `Indexing ${data.missingCount} remaining images in the background...`,
        )
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
    onSuccess: cleared => {
      toast.success(
        `Started AI re-indexing for ${cleared} images in the background.`,
      )
      queryClient.invalidateQueries({
        queryKey: ['settings', 'indexed-models'],
      })
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to trigger AI re-indexing')
    },
  })
}

import {
  APP_SETTING_KEYS,
  CLIP_AVAILABLE_MODELS_DEFAULT,
  CLIP_DEFAULT_MODEL,
  CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT,
  CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT,
  THUMBNAIL_QUALITY_DEFAULT,
  ClipModelConfig,
} from '@/lib/types/appSettingsKeys'

export function useClipEnabled(folderPath: string | null) {
  return useQuery<boolean>({
    queryKey: ['settings', APP_SETTING_KEYS.CLIP_ENABLED, folderPath],
    queryFn: async () => {
      if (!folderPath || !window.api || !window.api.settings.getValue) return true
      const val = await window.api.settings.getValue<boolean>(folderPath, APP_SETTING_KEYS.CLIP_ENABLED)
      return val !== undefined ? val : true
    },
    enabled: !!folderPath,
    staleTime: 5 * 60 * 1000,
  })
}

export function useClipModels(folderPath: string | null) {
  return useQuery<ClipModelConfig[]>({
    queryKey: ['settings', APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS, folderPath],
    queryFn: async () => {
      if (!folderPath || !window.api || !window.api.settings.getValue) {
        return CLIP_AVAILABLE_MODELS_DEFAULT
      }
      const models = await window.api.settings.getValue<ClipModelConfig[]>(
        folderPath,
        APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
      )
      if (!models || models.length === 0) {
        await window.api.settings.set(
          folderPath,
          APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
          CLIP_AVAILABLE_MODELS_DEFAULT,
          'json_array',
        )
        return CLIP_AVAILABLE_MODELS_DEFAULT
      }
      return models
    },
    enabled: !!folderPath,
    staleTime: 5 * 60 * 1000,
  })
}

export function useClipCurrentModel(folderPath: string | null) {
  return useQuery<string>({
    queryKey: ['settings', APP_SETTING_KEYS.CLIP_CURRENT_MODEL, folderPath],
    queryFn: async () => {
      if (!folderPath || !window.api || !window.api.settings.getValue) {
        return CLIP_DEFAULT_MODEL
      }
      const val = await window.api.settings.getValue<string>(
        folderPath,
        APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
      )
      return val || CLIP_DEFAULT_MODEL
    },
    enabled: !!folderPath,
    staleTime: 5 * 60 * 1000,
  })
}

export function useClipTextThreshold(folderPath: string | null) {
  return useQuery<number>({
    queryKey: ['settings', APP_SETTING_KEYS.CLIP_TEXT_TO_IMAGE_THRESHOLD, folderPath],
    queryFn: async () => {
      if (!folderPath || !window.api || !window.api.settings.getValue) {
        return CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT
      }
      const val = await window.api.settings.getValue<number>(
        folderPath,
        APP_SETTING_KEYS.CLIP_TEXT_TO_IMAGE_THRESHOLD,
      )
      return val !== undefined ? val : CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT
    },
    enabled: !!folderPath,
    staleTime: 5 * 60 * 1000,
  })
}

export function useClipImageThreshold(folderPath: string | null) {
  return useQuery<number>({
    queryKey: ['settings', APP_SETTING_KEYS.CLIP_IMAGE_TO_IMAGE_THRESHOLD, folderPath],
    queryFn: async () => {
      if (!folderPath || !window.api || !window.api.settings.getValue) {
        return CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT
      }
      const val = await window.api.settings.getValue<number>(
        folderPath,
        APP_SETTING_KEYS.CLIP_IMAGE_TO_IMAGE_THRESHOLD,
      )
      return val !== undefined ? val : CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT
    },
    enabled: !!folderPath,
    staleTime: 5 * 60 * 1000,
  })
}

export function useThumbnailQuality(folderPath: string | null) {
  return useQuery<number | null>({
    queryKey: ['settings', APP_SETTING_KEYS.THUMBNAIL_QUALITY, folderPath],
    queryFn: async () => {
      if (!folderPath || !window.api || !window.api.settings.getValue) {
        return THUMBNAIL_QUALITY_DEFAULT
      }
      const val = await window.api.settings.getValue<number | null>(
        folderPath,
        APP_SETTING_KEYS.THUMBNAIL_QUALITY,
      )
      return val !== undefined ? val : THUMBNAIL_QUALITY_DEFAULT
    },
    enabled: !!folderPath,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateSettingMutation(folderPath: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      key,
      value,
      valueType = 'string',
    }: {
      key: string
      value: any
      valueType?: 'string' | 'number' | 'boolean' | 'json' | 'json_array'
    }) => {
      if (!window.api || !window.api.settings.set) {
        throw new Error('settings.set API not available')
      }
      return await window.api.settings.set(folderPath, key, value, valueType)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['settings', variables.key, folderPath],
      })
      if (variables.key === APP_SETTING_KEYS.CLIP_ENABLED) {
        queryClient.invalidateQueries({ queryKey: ['images'] })
      }
    },
  })
}

