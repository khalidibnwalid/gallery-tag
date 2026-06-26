import { cn } from '@/lib/utils'
import {
  CaretRightIcon,
  FolderIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useFolder } from '../providers/FolderProvider'
import { Dialog, DialogContent } from '../ui/dialog'
import { Input } from '../ui/input'

interface RecentFoldersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecentFoldersDialog({
  open,
  onOpenChange,
}: RecentFoldersDialogProps) {
  const { recentFolders, openFolder, openFolderDialog, tabs } = useFolder()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = recentFolders
    .filter(path => !tabs.includes(path))
    .filter(path => {
      const name = path.split('/').pop() || path
      return (
        name.toLowerCase().includes(search.toLowerCase()) ||
        path.toLowerCase().includes(search.toLowerCase())
      )
    })

  // Add the folder explorer option to the end of the list
  const totalOptionsCount = filtered.length + 1

  useEffect(() => {
    if (open) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [open])

  const handleSelectOption = async (index: number) => {
    if (index < filtered.length) {
      const path = filtered[index]
      openFolder(path)
    } else {
      await openFolderDialog()
    }
    onOpenChange(false)
  }

  // Keyboard navigation logic
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % totalOptionsCount)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(
          prev => (prev - 1 + totalOptionsCount) % totalOptionsCount,
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelectOption(selectedIndex)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, filtered, totalOptionsCount])

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-background/90 backdrop-blur-xl border border-border/30 shadow-2xl rounded-2xl">
        <SearchHeader
          inputRef={inputRef}
          search={search}
          onSearchChange={val => {
            setSearch(val)
            setSelectedIndex(0)
          }}
        />

        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 no-scrollbar space-y-1 bg-card/10"
        >
          {filtered.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider select-none">
              Recent Galleries
            </div>
          )}

          {filtered.map((path, idx) => (
            <RecentFolderItem
              key={path}
              path={path}
              isActive={idx === selectedIndex}
              onClick={() => handleSelectOption(idx)}
              onMouseEnter={() => setSelectedIndex(idx)}
            />
          ))}

          <EmptyState
            show={filtered.length === 0 && search.trim().length > 0}
            search={search}
          />

          {filtered.length > 0 && (
            <div className="border-t border-border/10 my-2" />
          )}

          <SystemExplorerItem
            isActive={selectedIndex === filtered.length}
            onClick={() => handleSelectOption(filtered.length)}
            onMouseEnter={() => setSelectedIndex(filtered.length)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface SearchHeaderProps {
  inputRef: React.RefObject<HTMLInputElement | null>
  search: string
  onSearchChange: (value: string) => void
}

function SearchHeader({ inputRef, search, onSearchChange }: SearchHeaderProps) {
  return (
    <div className="relative flex items-center border-b border-border/20 px-4 h-14">
      <MagnifyingGlassIcon className="size-5 text-muted-foreground/60 shrink-0" />
      <Input
        ref={inputRef}
        placeholder="Search recent galleries or open a new one..."
        value={search}
        onValueChange={onSearchChange}
        className="flex-1 h-full bg-transparent! border-none! shadow-none! focus-visible:ring-0! text-[15px] px-3 placeholder:text-muted-foreground/40"
      />
      {/* <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/30 text-[10px] font-semibold text-muted-foreground select-none">
        ESC
      </div> */}
    </div>
  )
}

interface RecentFolderItemProps {
  path: string
  isActive: boolean
  onClick: () => void
  onMouseEnter: () => void
}

function RecentFolderItem({
  path,
  isActive,
  onClick,
  onMouseEnter,
}: RecentFolderItemProps) {
  const name = path.split('/').pop() || path

  return (
    <div
      data-active={isActive}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'group flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-foreground/80 hover:bg-muted/30 hover:text-foreground',
      )}
    >
      {/* Active side indicator pill */}
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-primary rounded-r-md" />
      )}

      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={cn(
            'p-2 rounded-lg transition-colors',
            isActive
              ? 'bg-primary/15 text-primary'
              : 'bg-muted/40 text-muted-foreground group-hover:bg-muted group-hover:text-foreground',
          )}
        >
          <FolderIcon
            className="size-4 shrink-0"
            weight={isActive ? 'fill' : 'regular'}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              'text-sm font-bold truncate transition-colors',
              isActive ? 'text-primary' : 'text-foreground',
            )}
          >
            {name}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground/75 truncate max-w-[380px]">
            {path}
          </span>
        </div>
      </div>

      {/* Return/Arrow indicator for active item */}
      <div className="flex items-center shrink-0 ml-4">
        {isActive ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/20 text-[9px] font-bold text-primary animate-fade-in">
            <span>OPEN</span>
            <CaretRightIcon className="size-3" weight="bold" />
          </div>
        ) : (
          <CaretRightIcon className="size-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  show: boolean
  search: string
}

function EmptyState({ show, search }: EmptyStateProps) {
  if (!show) return null
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground select-none animate-fade-in">
      <FolderIcon className="size-8 text-muted-foreground/30 mb-2 animate-pulse" />
      <p className="text-sm font-semibold">
        No recent galleries match "{search}"
      </p>
      <p className="text-xs text-muted-foreground/60 mt-0.5">
        Try searching with another folder name
      </p>
    </div>
  )
}

interface SystemExplorerItemProps {
  isActive: boolean
  onClick: () => void
  onMouseEnter: () => void
}

function SystemExplorerItem({
  isActive,
  onClick,
  onMouseEnter,
}: SystemExplorerItemProps) {
  return (
    <div
      data-active={isActive}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'group flex items-center justify-between px-3.5 py-3.5 rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden',
        isActive
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'text-primary hover:bg-primary/10',
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute left-0 top-3.5 bottom-3.5 w-[3px] bg-primary-foreground rounded-r-md" />
      )}

      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={cn(
            'p-2 rounded-lg',
            isActive
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-primary/10 text-primary group-hover:bg-primary/20',
          )}
        >
          <FolderOpenIcon className="size-4 shrink-0" weight="bold" />
        </div>
        <span className="text-sm font-bold">
          Open system folder explorer...
        </span>
      </div>

      <div className="flex items-center shrink-0 ml-4">
        {isActive ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary-foreground/20 text-[9px] font-bold text-primary-foreground">
            <span>ENTER</span>
            <CaretRightIcon className="size-3" weight="bold" />
          </div>
        ) : (
          <CaretRightIcon className="size-3.5 text-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  )
}
