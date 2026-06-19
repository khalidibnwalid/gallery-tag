import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import {
  CaretDownIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import {
  TagsExplorerProvider,
  useTagsExplorer,
} from './TagsExplorerContext'
import { TagTreeItem } from './TagTreeItem'

function TagsExplorerContent({ className }: { className?: string }) {
  const {
    selectedTags,
    excludedTags,
    tagMode,
    setTagMode,
    clearSelection,
    searchQuery,
    setSearchQuery,
    isLoading,
    filteredTree,
    isDragging,
    dragOverId,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    deleteTag,
    setDeleteTag,
    confirmDelete,
  } = useTagsExplorer()

  const [isExpanded, setIsExpanded] = useState(true)
  const hasSelection = selectedTags.length > 0 || excludedTags.length > 0

  return (
    <div
      className={cn(
        'flex flex-col transition-all duration-300 bg-background/50 backdrop-blur-sm',
        className,
        !isExpanded && 'flex-none',
      )}
    >
      <div
        className="px-6 py-4 border-b border-border/40 font-bold text-xs text-muted-foreground uppercase tracking-widest flex items-center justify-between cursor-pointer hover:text-foreground transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2">
          {isExpanded ? <CaretDownIcon /> : <CaretRightIcon />}
          Tags
        </span>
        <span className="flex items-center gap-1">
          <div className="flex bg-muted rounded-full p-1">
            <button
              onClick={e => {
                e.stopPropagation()
                setTagMode('AND')
              }}
              className={cn(
                'cursor-pointer px-2 py-1 text-[10px] font-bold uppercase rounded-full transition-colors',
                tagMode === 'AND'
                  ? 'bg-primary text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              AND
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                setTagMode('OR')
              }}
              className={cn(
                'cursor-pointer px-2 py-1 text-[10px] font-bold uppercase rounded-full transition-colors',
                tagMode === 'OR'
                  ? 'bg-primary text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              OR
            </button>
          </div>
          {hasSelection && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] uppercase font-bold text-destructive hover:text-primary/80"
              onClick={clearSelection}
            >
              <XIcon size={16} />
            </Button>
          )}
        </span>
      </div>

      {isExpanded && (
        <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-border/40">
            <Input
              placeholder="Filter tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
              startContent={
                <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
              }
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-between">
            <div className="px-4 py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner className="size-5" />
                </div>
              ) : filteredTree.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No matching tags' : 'No tags found'}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredTree.map(rootNode => (
                    <TagTreeItem key={rootNode.id} node={rootNode} />
                  ))}
                </div>
              )}
            </div>

            {/* Ungroup drop zone */}
            <div
              className={cn(
                'px-4 transition-all duration-200 ease-in-out',
                isDragging
                  ? 'max-h-24 pb-4 opacity-100'
                  : 'max-h-0 pb-0 opacity-0 overflow-hidden',
              )}
            >
              <div
                className={cn(
                  'border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 rounded-xl p-4 text-center text-xs text-muted-foreground font-semibold transition-all duration-200 select-none cursor-default',
                  dragOverId === 'root' && 'border-primary bg-primary/10 text-primary',
                )}
                onDragOver={e => handleDragOver(e, 'root')}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, 'root')}
              >
                Drop here to make root tag
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={deleteTag !== null}
        onOpenChange={open => !open && setDeleteTag(null)}
        title={`Delete "${deleteTag?.name ?? ''}"`}
        description="This will remove it from all images."
        actionLabel="Delete"
        onAction={confirmDelete}
      />
    </div>
  )
}

export function TagsExplorer({ className }: { className?: string }) {
  return (
    <TagsExplorerProvider>
      <TagsExplorerContent className={className} />
    </TagsExplorerProvider>
  )
}
