import { FolderTree } from '@/components/features/FolderTree'
import { TagsExplorer } from '@/components/features/TagsExplorer'
import { useSettingsStore } from '@/lib/store/settings'
import { cn } from '@/lib/utils'

export function SidebarFilters() {
  const { isFolderTreeOpen } = useSettingsStore()

  return (
    <aside
      className={cn(
        'sticky top-0 h-full z-30 shrink-0 flex flex-col transition-all duration-300',
        !isFolderTreeOpen
          ? 'w-0 overflow-hidden opacity-0 border-e-0'
          : 'w-80 border-e-2 border-border opacity-100',
      )}
    >
      <FolderTree className="flex-1 min-h-0" />
      <TagsExplorer className="flex-1 min-h-0 border-t border-border/40" />
    </aside>
  )
}
