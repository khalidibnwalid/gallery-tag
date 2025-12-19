import { cn } from '@/lib/utils'
import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'

type FileNode = {
  id: string
  name: string
  type: 'folder' | 'file'
  children?: FileNode[]
}

const mockData: FileNode = {
  id: 'root',
  name: 'Projects',
  type: 'folder',
  children: [
    {
      id: '1',
      name: 'gallery',
      type: 'folder',
      children: [
        { id: '1-1', name: 'src', type: 'folder' },
        { id: '1-2', name: 'public', type: 'folder' },
        { id: '1-3', name: 'package.json', type: 'file' },
      ],
    },
    {
      id: '2',
      name: 'documents',
      type: 'folder',
      children: [
        { id: '2-1', name: 'resume.pdf', type: 'file' },
        { id: '2-2', name: 'notes.txt', type: 'file' },
      ],
    },
    {
      id: '3',
      name: 'photos',
      type: 'folder',
      children: [{ id: '3-1', name: 'vacation', type: 'folder' }],
    },
  ],
}

export function FolderTree({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        className,
        'border-e-2 border-border h-full flex flex-col pt-16 transition-all duration-300',
      )}
    >
      <div className="px-6 py-4 border-b border-border/40 font-bold text-xs text-muted-foreground uppercase tracking-widest flex items-center justify-between">
        <span>Explorer</span>
      </div>
      <div className="flex-1 overflow-auto py-3 px-1 space-y-0.5">
        <TreeNode node={mockData} level={0} />
      </div>
    </div>
  )
}

function TreeNode({ node, level }: { node: FileNode; level: number }) {
  const [isOpen, setIsOpen] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  if (node.type !== 'folder') return null

  return (
    <div>
      <div
        className="flex items-center gap-2.5 pr-2 py-2 group select-none transition-colors"
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        <span
          className="text-muted-foreground/70 hover:text-foreground shrink-0 cursor-pointer p-0.5 hover:bg-accent rounded"
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
            <div className="w-[14px]" />
          )}
        </span>
        <div
          className="flex flex-1 items-center gap-2.5 cursor-pointer hover:bg-accent/50 hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
          onClick={() => {
            // TODO
            console.log('Navigate to folder:', node.name)
          }}
        >
          <FolderIcon
            className={isOpen ? 'text-primary' : 'text-muted-foreground'}
            weight={isOpen ? 'fill' : 'duotone'}
            size={20}
          />
          <span className="truncate font-medium">{node.name}</span>
        </div>
      </div>
      {isOpen && hasChildren && (
        <div className="mt-0.5">
          {node.children!.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
