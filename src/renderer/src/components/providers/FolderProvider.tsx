import useImages from '@/lib/queries/images'
import React, { createContext, useContext, useState } from 'react'

interface FolderProvider {
  folderPath: string | null
  setFolderPath: React.Dispatch<React.SetStateAction<string | null>>
  openFolderDialog: () => Promise<string | null>
  folderImagesQuery: ReturnType<typeof useImages>
}

const FolderContext = createContext({} as FolderProvider)

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const [folderPath, setFolderPath] = useState<string | null>(null)

  const folderImagesQuery = useImages(folderPath!)

  async function openFolderDialog(): Promise<string | null> {
    try {
      // Check if the API is available
      if (!window.api || !window.api.openFolderDialog) {
        console.error('API not available')
        alert('API not available. Make sure the app is running in Electron.')
        return null
      }
      const folderPath = await window.api.openFolderDialog()

      if (folderPath) {
        setFolderPath(folderPath)
      }
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
      }}
    >
      {children}
    </FolderContext.Provider>
  )
}

export const useFolder = () => useContext(FolderContext)
