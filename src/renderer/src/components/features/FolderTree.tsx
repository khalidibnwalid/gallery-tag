import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { Button } from '@/components/ui/button'
import { useAddFolderMutation, useFolders } from '@/lib/queries/folders'
import { cn } from '@/lib/utils'
import { FolderIcon, PlusIcon } from '@phosphor-icons/react'
import { useTimeout } from '@/lib/hooks/useTimeout'
import { memo, useRef, useState } from 'react'
import FolderTreeNode from './FolderTreeNode'

interface FolderTreeProps {
  className?: string
}

export const FolderTree = memo(function FolderTree({
  className,
}: FolderTreeProps) {
  const { folderPath: rootPath } = useFolder()
  const { data: folders, isLoading } = useFolders()
  const { filterPath, setFilterPath } = useSearch()
  const addFolder = useAddFolderMutation()
  const [isCreatingRoot, setIsCreatingRoot] = useState(false)
  const rootInputRef = useRef<HTMLInputElement>(null)

  useTimeout(
    () => {
      rootInputRef.current?.focus()
    },
    isCreatingRoot ? 50 : null,
  )

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
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => {
            setIsCreatingRoot(true)
          }}
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-3 px-3 space-y-1">
        {isLoading ? (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          <>
            {folders &&
              folders.length > 0 &&
              folders.map(folder => (
                <FolderTreeNode
                  key={folder.id}
                  node={folder}
                  level={0}
                  onSelect={setFilterPath}
                  selectedPath={filterPath}
                />
              ))}
            {isCreatingRoot && (
              <div
                style={{ paddingLeft: '8px' }}
                className="flex items-center h-9 pr-3"
              >
                <FolderIcon
                  className="mr-2 size-[18px] text-primary"
                  weight="fill"
                />
                <input
                  ref={rootInputRef}
                  placeholder="New folder..."
                  className="bg-transparent border-b border-primary text-sm font-semibold outline-none w-full py-0.5"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value.trim()
                      if (val)
                        addFolder.mutate({
                          parentPath: rootPath,
                          folderName: val,
                        })
                      setIsCreatingRoot(false)
                    } else if (e.key === 'Escape') {
                      setIsCreatingRoot(false)
                    }
                  }}
                  onBlur={e => {
                    const val = e.currentTarget.value.trim()
                    if (val)
                      addFolder.mutate({
                        parentPath: rootPath,
                        folderName: val,
                      })
                    setIsCreatingRoot(false)
                  }}
                />
              </div>
            )}
            {(!folders || folders.length === 0) && !isCreatingRoot && (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No folders found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})
