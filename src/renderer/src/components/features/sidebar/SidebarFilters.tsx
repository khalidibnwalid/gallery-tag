import { FolderTree } from '@/components/features/FolderTree'
import { TagsExplorer } from '@/components/features/tags/TagsExplorer'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useSettingsStore } from '@/lib/store/settings'
import { cn } from '@/lib/utils'
import { Ribbon } from './Ribbon'
import { ResizableSidebar } from './ResizableSidebar'

export function SidebarFilters() {
  const { isFolderTreeOpen, toggleFolderTree } = useSettingsStore()
  const [showFolders, setShowFolders] = useLocalStorage('sidebar-show-folders', true)
  const [showTags, setShowTags] = useLocalStorage('sidebar-show-tags', true)

  const handleToggleFolders = () => {
    if (isFolderTreeOpen) {
      if (showFolders) {
        if (!showTags) {
          // Folders is the only one open, collapse the sidebar
          toggleFolderTree()
        } else {
          // Tags is also open, just hide folders
          setShowFolders(false)
        }
      } else {
        // Folders was hidden, show it
        setShowFolders(true)
      }
    } else {
      // Sidebar is closed, open it and make folders visible
      setShowFolders(true)
      toggleFolderTree()
    }
  }

  const handleToggleTags = () => {
    if (isFolderTreeOpen) {
      if (showTags) {
        if (!showFolders) {
          // Tags is the only one open, collapse the sidebar
          toggleFolderTree()
        } else {
          // Folders is also open, just hide tags
          setShowTags(false)
        }
      } else {
        // Tags was hidden, show it
        setShowTags(true)
      }
    } else {
      // Sidebar is closed, open it and make tags visible
      setShowTags(true)
      toggleFolderTree()
    }
  }

  const handleToggleSidebar = () => {
    // If we are opening the sidebar, make sure at least folders is visible if both were false
    if (!isFolderTreeOpen && !showFolders && !showTags) {
      setShowFolders(true)
    }
    toggleFolderTree()
  }

  const isSidebarOpen = isFolderTreeOpen && (showFolders || showTags)

  return (
    <div className="sticky top-0 h-full z-30 flex shrink-0 select-none">
      <Ribbon
        isSidebarOpen={isSidebarOpen}
        showFolders={showFolders}
        showTags={showTags}
        onToggleSidebar={handleToggleSidebar}
        onToggleFolders={handleToggleFolders}
        onToggleTags={handleToggleTags}
      />

      <ResizableSidebar
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
      >
        {showFolders && <FolderTree className="flex-1 min-h-0" />}
        {showTags && (
          <TagsExplorer
            className={cn(
              'flex-1 min-h-0',
              showFolders && 'border-t border-border/40',
            )}
          />
        )}
      </ResizableSidebar>
    </div>
  )
}
