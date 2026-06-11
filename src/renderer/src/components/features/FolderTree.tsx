import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { Button } from '@/components/ui/button'
import { useFolders } from '@/lib/queries/folders'
import { cn } from '@/lib/utils'
import { FolderModel } from '@main/types/models.shared'
import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
} from '@phosphor-icons/react'
import { memo, useState } from 'react'

interface FolderTreeProps {
  className?: string
}

export const FolderTree = memo(function FolderTree({
  className,
}: FolderTreeProps) {
  const { folderPath: rootPath } = useFolder()
  const { data: folders, isLoading } = useFolders()
  const { filterPath, setFilterPath } = useSearch()

  if (!rootPath) return null

  return (
    <div
      className={cn(
        className,
        'flex flex-col pt-16 transition-all duration-300',
      )}
    >
      <div className="px-6 py-4 border-b border-border/40 font-bold text-xs text-muted-foreground uppercase tracking-widest flex items-center justify-between">
        <span>Explorer</span>
      </div>
      <div className="flex-1 overflow-auto py-3 px-3 space-y-1">
        {isLoading ? (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : folders && folders.length > 0 ? (
          folders.map(folder => (
            <TreeNode
              key={folder.id}
              node={folder}
              level={0}
              onSelect={setFilterPath}
              selectedPath={filterPath}
            />
          ))
        ) : (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            No folders found
          </div>
        )}
      </div>
    </div>
  )
})

function TreeNode({
  node,
  level,
  onSelect,
  selectedPath,
}: {
  node: FolderModel
  level: number
  onSelect?: (path: string | null) => void
  selectedPath?: string | null
}) {
  const [isOpen, setIsOpen] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  const isSelected = selectedPath === node.path

  return (
    <div>
      <Button
        variant={isSelected ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start h-9 pr-3 text-sm font-semibold rounded-md transition-all duration-150',
          isSelected && 'bg-primary! text-primary-foreground',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect?.(node.path)}
      >
        <span
          className="mr-1.5 cursor-pointer hover:bg-pure/20 rounded p-0.5 shrink-0"
          onClick={e => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
        >
          {hasChildren ? (
            isOpen ? (
              <CaretDownIcon size={13} />
            ) : (
              <CaretRightIcon size={13} />
            )
          ) : (
            <div className="w-[13px] h-[13px]" />
          )}
        </span>
        <FolderIcon
          className={cn(
            'mr-2 size-[18px]',
            isSelected ? 'text-primary-foreground' : 'text-primary',
          )}
          weight={isOpen || isSelected ? 'fill' : 'duotone'}
        />
        <span className="truncate">{node.name}</span>
      </Button>
      {isOpen && hasChildren && (
        <div className="mt-0.5">
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}
