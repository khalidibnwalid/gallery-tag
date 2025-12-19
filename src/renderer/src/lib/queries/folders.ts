import { useFolder } from '@/components/providers/FolderProvider'
import { FolderModel } from '@main/types/models.shared'
import { useQuery } from '@tanstack/react-query'

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
