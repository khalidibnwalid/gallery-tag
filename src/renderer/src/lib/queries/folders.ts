import { useFolder } from '@/components/providers/FolderProvider'
import { FolderModel } from '@main/types/models.shared'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useFolders() {
  const { folderPath } = useFolder()

  return useQuery<FolderModel[]>({
    queryKey: ['folders', folderPath],
    queryFn: async () => {
      if (!window.api || !window.api.folders) {
        throw new Error('Folders API not available')
      }
      if (!folderPath) return []
      return await window.api.folders.getAll(folderPath)
    },
    enabled: !!folderPath,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useAddFolderMutation() {
  const queryClient = useQueryClient()
  const { folderPath } = useFolder()

  return useMutation({
    mutationFn: async ({
      parentPath,
      folderName,
    }: {
      parentPath: string
      folderName: string
    }) => {
      if (!window.api || !window.api.folders.add) {
        throw new Error('Folders add API not available')
      }
      return await window.api.folders.add(parentPath, folderName)
    },
    onSuccess: (data) => {
      toast.success(`Created folder "${data.name}"`)
      queryClient.invalidateQueries({ queryKey: ['folders', folderPath] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create folder')
    },
  })
}

export function useRenameFolderMutation() {
  const queryClient = useQueryClient()
  const { folderPath } = useFolder()

  return useMutation({
    mutationFn: async ({
      folderId,
      newName,
    }: {
      folderId: number
      newName: string
    }) => {
      if (!window.api || !window.api.folders.rename) {
        throw new Error('Folders rename API not available')
      }
      return await window.api.folders.rename(folderId, newName)
    },
    onSuccess: (data) => {
      toast.success(`Renamed folder to "${data.name}"`)
      queryClient.invalidateQueries({ queryKey: ['folders', folderPath] })
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to rename folder')
    },
  })
}
