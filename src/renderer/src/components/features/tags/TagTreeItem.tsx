import { cn } from '@/lib/utils'
import { ArrowElbowDownRightIcon, CaretDownIcon } from '@phosphor-icons/react'
import { TagExplorerNode } from './TagExplorerNode'
import { useTagsExplorer, TagWithChildren } from './TagsExplorerContext'

interface TagTreeItemProps {
  node: TagWithChildren
  isChild?: boolean
  depth?: number
}

export function TagTreeItem({
  node,
  isChild = false,
  depth = 0,
}: TagTreeItemProps) {
  const {
    selectedTags,
    excludedTags,
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    expandedTagIds,
    toggleExpand,
    hoveredTagId,
    setHoveredTagId,
    sortedTags,
    isDescendant,
    isDragging,
  } = useTagsExplorer()

  const isSelected = selectedTags.includes(node.name)
  const isExcluded = excludedTags.includes(node.name)
  const hasChildren = node.children.length > 0
  const isDragOver = dragOverId === node.id
  const isExpanded = expandedTagIds[node.id] !== false

  // Hover parent highlight checks (only computed if not dragging)
  const hoveredTag = sortedTags.find(t => t.id === hoveredTagId)
  const isParentOfHovered = !isDragging && hoveredTag && hoveredTag.parentId === node.id
  const isAncestorOfHovered =
    !isDragging &&
    hoveredTagId !== null &&
    !isParentOfHovered &&
    isDescendant(node.id, hoveredTagId)

  return (
    <>
      <div
        draggable
        onDragStart={e => handleDragStart(e, node.id)}
        onDragOver={e => handleDragOver(e, node.id)}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, node.id)}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => {
          if (!isDragging && hoveredTagId !== node.id) {
            setHoveredTagId(node.id)
          }
        }}
        onMouseLeave={() => {
          if (!isDragging && hoveredTagId === node.id) {
            setHoveredTagId(null)
          }
        }}
        className={cn(
          'py-2 inline-flex items-center gap-0 bg-primary/5 rounded-full border border-border/30 p-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none hover:bg-primary/10',
          isSelected && 'bg-primary! text-primary-foreground border-primary',
          isExcluded && 'bg-destructive! text-destructive-foreground border-destructive',
          isDragOver && 'border-primary ring-2 ring-primary/45 scale-105',
          isChild && 'border-muted-foreground/45 pl-1',

          // Highlights when hovered over a child
          isParentOfHovered &&
            'border-primary/80 bg-primary/10 ring-1 ring-primary/40 shadow-sm',
          isAncestorOfHovered &&
            'border-primary/40 bg-primary/3 ring-1 ring-primary/10',
        )}
      >
        {isChild && (
          <ArrowElbowDownRightIcon className="size-3 text-muted-foreground/60 ml-1.5 shrink-0" />
        )}
        <TagExplorerNode node={node} />

        {hasChildren && (
          <button
            onClick={e => {
              e.stopPropagation()
              toggleExpand(node.id)
            }}
            className={cn(
              'h-5 flex items-center gap-1 bg-foreground/5 rounded-full px-1 text-[10px] font-bold transition-colors cursor-pointer select-none mr-1 text-muted-foreground/80 hover:text-foreground',
              isSelected
                ? 'text-primary-foreground/80 hover:text-primary-foreground'
                : 'text-muted-foreground/80 hover:text-foreground',
            )}
          >
            <span>{node.children.length}</span>
            <CaretDownIcon
              size={7}
              className={cn(
                'transition-transform duration-200 size-2.5',
                isExpanded && 'rotate-180',
              )}
            />
          </button>
        )}
      </div>

      {isExpanded &&
        node.children.map(child => (
          <TagTreeItem
            key={child.id}
            node={child}
            isChild={true}
            depth={depth + 1}
          />
        ))}
    </>
  )
}
