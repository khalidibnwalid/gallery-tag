import useImages, { useInfiniteImages } from '@/lib/queries/images'
import { useTags } from '@/lib/queries/tags'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useQueryClient } from '@tanstack/react-query'
import React, { createContext, useContext, useState, useEffect } from 'react'

interface FolderProvider {
  folderPath: string | null
  setFolderPath: React.Dispatch<React.SetStateAction<string | null>>
  openFolderDialog: () => Promise<string | null>
  openFolder: (path: string) => void
  recentFolders: string[]
  removeRecentFolder: (path: string) => void
  folderImagesQuery: ReturnType<typeof useImages>
  paginatedImagesQuery: ReturnType<typeof useInfiniteImages>
  tagsQuery: ReturnType<typeof useTags>
}

const FolderContext = createContext({} as FolderProvider)

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [recentFolders, setRecentFolders] = useLocalStorage<string[]>(
    'recent-folders',
    [],
  )

  const folderImagesQuery = useImages(folderPath!)
  const paginatedImagesQuery = useInfiniteImages(folderPath!)
  const tagsQuery = useTags()

  const queryClient = useQueryClient()

  // Track folder changes to update recent-folders list
  useEffect(() => {
    if (folderPath) {
      setRecentFolders(prev =>
        [folderPath, ...prev.filter(p => p !== folderPath)].slice(0, 5),
      )
    }
  }, [folderPath])

  function openFolder(path: string) {
    setFolderPath(path)
    queryClient.clear()
  }

  const removeRecentFolder = (path: string) => {
    setRecentFolders(prev => prev.filter(p => p !== path))
  }

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
        openFolder,
        recentFolders,
        removeRecentFolder,
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
