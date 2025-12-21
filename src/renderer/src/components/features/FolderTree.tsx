import { useFolder } from '@/components/providers/FolderProvider'
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
  onSelect?: (path: string | null) => void
  selectedPath?: string | null
}

export const FolderTree = memo(function FolderTree({
  className,
  onSelect,
  selectedPath,
}: FolderTreeProps) {
  const { folderPath: rootPath } = useFolder()
  const { data: folders, isLoading } = useFolders()

  if (!rootPath) return null

  return (
    <div
      className={cn(
        className,
        'border-e-2 border-border flex flex-col pt-16 transition-all duration-300',
      )}
    >
      <div className="px-6 py-4 border-b border-border/40 font-bold text-xs text-muted-foreground uppercase tracking-widest flex items-center justify-between">
        <span>Explorer</span>
      </div>
      <div className="flex-1 overflow-auto py-3 px-1 space-y-0.5">
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
              onSelect={onSelect}
              selectedPath={selectedPath}
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
          'w-full justify-start h-10 pr-4 font-bold',
          isSelected && 'bg-primary! text-primary-foreground',
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect?.(node.path)}
      >
        <span
          className="mr-2 cursor-pointer hover:bg-pure/20 rounded p-0.5 shrink-0"
          onClick={e => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
        >
          {hasChildren ? (
            isOpen ? (
              <CaretDownIcon size={14} />
            ) : (
              <CaretRightIcon size={14} />
            )
          ) : (
            <div className="w-[14px] h-[14px]" />
          )}
        </span>
        <FolderIcon
          className={cn(
            'mr-2 size-5',
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
