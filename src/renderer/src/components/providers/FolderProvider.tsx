import useImages, { useInfiniteImages } from '@/lib/queries/images'
import { useTags } from '@/lib/queries/tags'
import { useQueryClient } from '@tanstack/react-query'
import React, { createContext, useContext, useState } from 'react'

interface FolderProvider {
  folderPath: string | null
  setFolderPath: React.Dispatch<React.SetStateAction<string | null>>
  openFolderDialog: () => Promise<string | null>
  folderImagesQuery: ReturnType<typeof useImages>
  paginatedImagesQuery: ReturnType<typeof useInfiniteImages>
  tagsQuery: ReturnType<typeof useTags>
}

const FolderContext = createContext({} as FolderProvider)

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const [folderPath, setFolderPath] = useState<string | null>(null)

  const folderImagesQuery = useImages(folderPath!)
  const paginatedImagesQuery = useInfiniteImages(folderPath!)
  const tagsQuery = useTags()

  const queryClient = useQueryClient()

  async function openFolderDialog(): Promise<string | null> {
    try {
      if (!window.api || !window.api.system.openFolderDialog) {
        console.error('API not available')
        alert('API not available. Make sure the app is running in Electron.')
        return null
      }
      const folderPath = await window.api.system.openFolderDialog()

      if (folderPath) {
        setFolderPath(folderPath)
      }
      queryClient.clear()
      return folderPath
    } catch (error) {
      console.error('Error opening folder:', error)
      alert(`Error opening folder: ${error}`)
      return null
    }
  }

  return (
    <FolderContext.Provider
      value={{
        folderPath,
        setFolderPath,
        openFolderDialog,
        folderImagesQuery,
        paginatedImagesQuery,
        tagsQuery,
      }}
    >
      {children}
    </FolderContext.Provider>
  )
}

export const useFolder = () => useContext(FolderContext)
