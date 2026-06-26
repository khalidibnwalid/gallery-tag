import { useHotkey } from '@tanstack/react-hotkeys'
import { useFolder } from '@/components/providers/FolderProvider'
import { useSettingsStore } from '@/lib/store/settings'
import { useKeybindsStore } from '@/lib/store/keybindsStore'
import { useSelectionStore } from '@/lib/store/selection'
import { useInfiniteImages } from '@/lib/queries/images'
import { useSearch } from '@/components/providers/SearchProvider'
import { DEFAULT_HOTKEYS } from '@/lib/types/keybinds'
import { useLighthouse } from '@/components/providers/LighthouseProvider'

export function useAppHotkeys() {
  const { folderPath, tabs, openFolder, closeTab, setRecentFoldersOpen } = useFolder()
  const { toggleFolderTree } = useSettingsStore()
  const { keybinds } = useKeybindsStore()
  const { filter } = useSearch()
  const { isOpen: isLighthouseOpen } = useLighthouse()
  
  const isSelectionMode = useSelectionStore(state => state.isSelectionMode)
  const toggleSelectionMode = useSelectionStore(state => state.toggleSelectionMode)
  const selectAll = useSelectionStore(state => state.selectAll)
  const clearSelection = useSelectionStore(state => state.clearSelection)
  const selectedItems = useSelectionStore(state => state.selectedItems)

  const { data: infiniteData } = useInfiniteImages(folderPath ?? undefined, 50, filter)

  // 1. Toggle Search
  useHotkey(
    (keybinds.toggleSearch || DEFAULT_HOTKEYS.toggleSearch) as any,
    (e) => {
      e.preventDefault()
      const input = document.getElementById('search-bar-input') as HTMLInputElement | null
      if (input) {
        if (document.activeElement === input) {
          input.blur()
        } else {
          input.focus()
          input.select()
        }
      }
    },
    {
      enabled: !!folderPath,
      ignoreInputs: false,
    }
  )

  // 2. Switching tabs - Next Tab
  useHotkey(
    (keybinds.nextTab || DEFAULT_HOTKEYS.nextTab) as any,
    (e) => {
      e.preventDefault()
      if (tabs.length > 1 && folderPath) {
        const currentIndex = tabs.indexOf(folderPath)
        const nextIndex = (currentIndex + 1) % tabs.length
        openFolder(tabs[nextIndex])
      }
    },
    {
      enabled: !!folderPath && tabs.length > 1,
      ignoreInputs: false,
    }
  )

  // 3. Switching tabs - Prev Tab
  useHotkey(
    (keybinds.prevTab || DEFAULT_HOTKEYS.prevTab) as any,
    (e) => {
      e.preventDefault()
      if (tabs.length > 1 && folderPath) {
        const currentIndex = tabs.indexOf(folderPath)
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
        openFolder(tabs[prevIndex])
      }
    },
    {
      enabled: !!folderPath && tabs.length > 1,
      ignoreInputs: false,
    }
  )

  // 4. Closing Tab
  useHotkey(
    (keybinds.closeTab || DEFAULT_HOTKEYS.closeTab) as any,
    (e) => {
      e.preventDefault()
      if (folderPath) {
        closeTab(folderPath)
      }
    },
    {
      enabled: !!folderPath,
      ignoreInputs: false,
    }
  )

  // 5. Toggle Sidebar
  useHotkey(
    (keybinds.toggleSidebar || DEFAULT_HOTKEYS.toggleSidebar) as any,
    (e) => {
      e.preventDefault()
      toggleFolderTree()
    },
    {
      enabled: !!folderPath,
      ignoreInputs: false,
    }
  )

  // 6. Toggle Selection Mode
  useHotkey(
    (keybinds.toggleSelectionMode || DEFAULT_HOTKEYS.toggleSelectionMode) as any,
    (e) => {
      e.preventDefault()
      toggleSelectionMode()
    },
    {
      enabled: !!folderPath,
      ignoreInputs: false,
    }
  )

  // 7. Select All
  useHotkey(
    (keybinds.selectAll || DEFAULT_HOTKEYS.selectAll) as any,
    (e) => {
      e.preventDefault()
      const images = infiniteData?.pages.flatMap(page => page.data) || []
      if (images.length > 0) {
        const allIds = images.map(img => img.id)
        if (!isSelectionMode) {
          toggleSelectionMode(true)
          selectAll(allIds)
        } else {
          const isAllSelected = images.every(img => selectedItems.has(img.id))
          if (isAllSelected) {
            clearSelection()
          } else {
            selectAll(allIds)
          }
        }
      }
    },
    {
      enabled: !!folderPath,
      ignoreInputs: false,
    }
  )

  // 8. Delete Selected Images (in Selection Mode) / Lighthouse Image
  useHotkey(
    (keybinds.deleteSelected || DEFAULT_HOTKEYS.deleteSelected) as any,
    (e) => {
      e.preventDefault()
      if (isLighthouseOpen) {
        document.getElementById('lighthouse-delete-trigger')?.click()
      } else if (isSelectionMode && selectedItems.size > 0) {
        useSelectionStore.getState().setDeleteDialogOpen(true)
      }
    },
    {
      enabled: !!folderPath && (isLighthouseOpen || (isSelectionMode && selectedItems.size > 0)),
      ignoreInputs: false,
    }
  )

  // 9. Rename Selected Image (F2) / Lighthouse Image
  useHotkey(
    (keybinds.rename || DEFAULT_HOTKEYS.rename) as any,
    (e) => {
      e.preventDefault()
      if (isLighthouseOpen) {
        document.getElementById('lighthouse-rename-trigger')?.click()
      } else if (isSelectionMode && selectedItems.size === 1) {
        const firstId = Array.from(selectedItems)[0]
        useSelectionStore.getState().setRenamingImageId(firstId)
      }
    },
    {
      enabled: !!folderPath && (isLighthouseOpen || (isSelectionMode && selectedItems.size === 1)),
      ignoreInputs: false,
    }
  )

  // 10. Open Folder Dialog (Control+o)
  useHotkey(
    (keybinds.openFolder || DEFAULT_HOTKEYS.openFolder) as any,
    (e) => {
      e.preventDefault()
      setRecentFoldersOpen(true)
    },
    {
      enabled: true,
      ignoreInputs: false,
    }
  )

  // 11. Toggle Tagging Dialog (Control+t)
  useHotkey(
    (keybinds.toggleTagging || DEFAULT_HOTKEYS.toggleTagging) as any,
    (e) => {
      e.preventDefault()
      const triggerId = isLighthouseOpen ? 'lighthouse-tag-trigger' : 'subbar-tag-trigger'
      document.getElementById(triggerId)?.click()
    },
    {
      enabled: !!folderPath && (isLighthouseOpen || isSelectionMode),
      ignoreInputs: false,
    }
  )

  // 12. Toggle AI Search Mode (Control+Shift+p)
  useHotkey(
    (keybinds.toggleAiSearch || DEFAULT_HOTKEYS.toggleAiSearch) as any,
    (e) => {
      e.preventDefault()
      document.getElementById('ai-search-toggle-trigger')?.click()
      
      const input = document.getElementById('search-bar-input') as HTMLInputElement | null
      if (input && document.activeElement !== input) {
        input.focus()
        input.select()
      }
    },
    {
      enabled: !!folderPath,
      ignoreInputs: false,
    }
  )
}
