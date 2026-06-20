import useImages, { useInfiniteImages } from '@/lib/queries/images'
import { useTags } from '@/lib/queries/tags'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useQueryClient } from '@tanstack/react-query'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { SetupWizardDialog } from '@/components/features/SetupWizardDialog'

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
  const [pendingFolderPath, setPendingFolderPath] = useState<string | null>(null)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
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

  async function openFolder(path: string) {
    try {
      const isNew = await window.api.folders.isNew(path)
      if (isNew) {
        setPendingFolderPath(path)
        setShowSetupDialog(true)
      } else {
        setFolderPath(path)
        queryClient.clear()
        queryClient.invalidateQueries()
      }
    } catch (e) {
      console.error('Failed to check if folder is new:', e)
      // Fallback
      setFolderPath(path)
      queryClient.clear()
      queryClient.invalidateQueries()
    }
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
      const selectedPath = await window.api.system.openFolderDialog()

      if (selectedPath) {
        await openFolder(selectedPath)
      }
      return selectedPath
    } catch (error) {
      console.error('Error opening folder:', error)
      alert(`Error opening folder: ${error}`)
      return null
    }
  }

  const handleWizardStart = async (settings: {
    aiEnabled: boolean
    clipModel: string
    thumbnailQuality: number | null
  }) => {
    if (!pendingFolderPath) return
    try {
      await window.api.folders.initWithSettings(pendingFolderPath, settings)
      setFolderPath(pendingFolderPath)
      queryClient.clear()
      queryClient.invalidateQueries()
      setShowSetupDialog(false)
      setPendingFolderPath(null)
    } catch (err) {
      console.error('Wizard setup failed:', err)
      alert(`Failed to initialize folder settings: ${err}`)
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
      {pendingFolderPath && (
        <SetupWizardDialog
          open={showSetupDialog}
          onOpenChange={setShowSetupDialog}
          folderPath={pendingFolderPath}
          onStart={handleWizardStart}
        />
      )}
    </FolderContext.Provider>
  )
}

export const useFolder = () => useContext(FolderContext)
