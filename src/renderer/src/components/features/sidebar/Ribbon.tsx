import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FolderIcon, SidebarSimpleIcon, TagIcon } from '@phosphor-icons/react'

interface RibbonProps {
  isSidebarOpen: boolean
  showFolders: boolean
  showTags: boolean
  onToggleSidebar: () => void
  onToggleFolders: () => void
  onToggleTags: () => void
}

export function Ribbon({
  isSidebarOpen,
  showFolders,
  showTags,
  onToggleSidebar,
  onToggleFolders,
  onToggleTags,
}: RibbonProps) {
  return (
    <div className="w-16 h-full border-e border-border/40 bg-background/25 backdrop-blur-md flex flex-col items-center py-4 gap-3 z-40 shrink-0 pt-16 select-none">
      {/* Toggle Sidebar Button */}
      <Button
        variant="ghost"
        size="icon"
        className="size-10 text-muted-foreground hover:text-foreground cursor-pointer rounded-xl transition-all duration-200 hover:bg-accent/50 active:scale-95"
        onClick={onToggleSidebar}
        title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
      >
        <SidebarSimpleIcon
          className={cn(
            'size-5 transition-transform duration-300',
            !isSidebarOpen && 'rotate-180',
          )}
          weight="regular"
        />
      </Button>

      <div className="w-8 h-px bg-border/40 my-1" />

      {/* Folders Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'size-10 rounded-xl cursor-pointer transition-all duration-200 active:scale-95',
          isSidebarOpen && showFolders
            ? 'text-primary hover:bg-accent/50 bg-accent/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
        )}
        onClick={onToggleFolders}
        title="Toggle Explorer"
      >
        <FolderIcon
          className="size-5"
          weight={isSidebarOpen && showFolders ? 'fill' : 'regular'}
        />
      </Button>

      {/* Tags Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'size-10 rounded-xl cursor-pointer transition-all duration-200 active:scale-95',
          isSidebarOpen && showTags
            ? 'text-primary hover:bg-accent/50 bg-accent/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
        )}
        onClick={onToggleTags}
        title="Toggle Tags"
      >
        <TagIcon
          className="size-5"
          weight={isSidebarOpen && showTags ? 'fill' : 'regular'}
        />
      </Button>
    </div>
  )
}
