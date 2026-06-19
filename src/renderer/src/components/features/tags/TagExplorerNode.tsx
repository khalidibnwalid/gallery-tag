import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  CheckIcon,
  PencilSimpleIcon,
  ProhibitIcon,
  TagIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useTagsExplorer, TagWithChildren } from './TagsExplorerContext'

interface TagExplorerNodeProps {
  node: TagWithChildren
}

export function TagExplorerNode({ node }: TagExplorerNodeProps) {
  const {
    selectedTags,
    excludedTags,
    renamingTagId,
    renameValue,
    setRenameValue,
    setRenamingTagId,
    submitRename,
    handleTagToggle,
    handleRename,
    handleDelete,
    handleSetParent,
    sortedTags,
    isDescendant,
  } = useTagsExplorer()

  const isSelected = selectedTags.includes(node.name)
  const isExcluded = excludedTags.includes(node.name)

  if (renamingTagId === node.id) {
    return (
      <form
        onSubmit={e => {
          e.preventDefault()
          submitRename()
        }}
        className="inline-block"
      >
        <Input
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={submitRename}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setRenamingTagId(null)
              setRenameValue('')
            }
          }}
          className="h-6 text-xs rounded-full px-2 w-24 inline-block"
          autoFocus
        />
      </form>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-6 justify-start gap-1 rounded-full px-2 text-xs font-semibold hover:bg-transparent! select-none shrink-0',
            isSelected &&
              'text-primary-foreground hover:text-primary-foreground!',
            isExcluded &&
              'text-destructive-foreground hover:text-destructive-foreground!',
          )}
          onClick={event => handleTagToggle(node.name, event)}
        >
          {isSelected ? (
            <CheckIcon className="size-3 shrink-0" weight="bold" />
          ) : isExcluded ? (
            <ProhibitIcon className="size-3 shrink-0" weight="bold" />
          ) : (
            <TagIcon className="size-3 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 max-w-[120px] truncate">{node.name}</span>
        </Button>
      </ContextMenuTrigger>

      <ContextMenuContent className="min-w-[140px]">
        <ContextMenuItem onClick={() => handleRename(node)}>
          <PencilSimpleIcon className="size-3.5" />
          Rename
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <TagIcon className="size-3.5 mr-2" />
            Move to
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-60 overflow-y-auto">
            <ContextMenuItem onClick={() => handleSetParent(node.id, null)}>
              {node.parentId === null || node.parentId === undefined ? (
                <CheckIcon className="size-3 mr-1" />
              ) : null}
              None
            </ContextMenuItem>
            <ContextMenuSeparator />
            {sortedTags
              .filter(t => t.id !== node.id && !isDescendant(node.id, t.id))
              .map(potentialParent => (
                <ContextMenuItem
                  key={potentialParent.id}
                  onClick={() => handleSetParent(node.id, potentialParent.id)}
                >
                  {node.parentId === potentialParent.id ? (
                    <CheckIcon className="size-3 mr-1" />
                  ) : null}
                  {potentialParent.name}
                </ContextMenuItem>
              ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem
          variant="destructive"
          onClick={() => handleDelete(node)}
        >
          <TrashIcon className="size-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
