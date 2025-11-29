import { useQuery } from '@tanstack/react-query'
import QUERIES from './constants'
import { useFolder } from '@/components/providers/FolderProvider'


// TODO: pagination or lazy loading for folders larger than a threshold
export default function useImagesPaths(folderPath?: string) {
  const { folderPath: contextFolderPath } = useFolder()
  folderPath ||= contextFolderPath || ''

  return useQuery<string[]>({
    queryKey: QUERIES.IMAGES_PATHS(folderPath),
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
