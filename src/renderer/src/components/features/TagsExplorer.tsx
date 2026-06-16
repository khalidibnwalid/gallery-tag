import { useSearch } from '@/components/providers/SearchProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useTags } from '@/lib/queries/tags'
import { cn } from '@/lib/utils'
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
  TagIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'

export function TagsExplorer({ className }: { className?: string }) {
  const {
    filterTags: selectedTags = [],
    excludedTags = [],
    tagMode,
    setTagMode: onSetTagMode,
    setFilterTags: onSelectTags,
    setExcludedTags: onExcludeTags,
  } = useSearch()
  const [isExpanded, setIsExpanded] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: tags, isLoading } = useTags()

  const sortedTags = useMemo(() => {
    if (!tags) return []
    return [...tags].sort((a, b) => a.name.localeCompare(b.name))
  }, [tags])

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return sortedTags
    return sortedTags.filter(tag =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [sortedTags, searchQuery])

  const handleTagToggle = (
    tagName: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (!onSelectTags || !onExcludeTags) return

    const isSelected = selectedTags.includes(tagName)
    const isExcluded = excludedTags.includes(tagName)

    if (event.ctrlKey || event.metaKey) {
      onSelectTags(selectedTags.filter(t => t !== tagName))
      onExcludeTags(
        isExcluded
          ? excludedTags.filter(t => t !== tagName)
          : [...excludedTags, tagName],
      )
    } else if (isExcluded) {
      onExcludeTags(excludedTags.filter(t => t !== tagName))
    } else {
      onSelectTags(
        isSelected
          ? selectedTags.filter(t => t !== tagName)
          : [...selectedTags, tagName],
      )
    }
  }

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectTags?.([])
    onExcludeTags?.([])
  }

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
                onSetTagMode('AND')
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
                onSetTagMode('OR')
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

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-3 py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner className="size-5" />
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No matching tags' : 'No tags found'}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map(tag => {
                    const isSelected = selectedTags.includes(tag.name)
                    const isExcluded = excludedTags.includes(tag.name)

                    return (
                      <Button
                        key={tag.id}
                        variant="ghost"
                        className={cn(
                          'h-8 max-w-full justify-start gap-1.5  hover:opacity-70 bg-primary/5 rounded-full px-3 text-sm font-semibold transition-all duration-150',
                          isSelected &&
                            'bg-primary! text-primary-foreground hover:text-primary-foreground',
                          isExcluded &&
                            'bg-destructive! text-destructive-foreground',
                        )}
                        onClick={event => handleTagToggle(tag.name, event)}
                      >
                        {isSelected ? (
                          <CheckIcon
                            className="size-3.5 shrink-0"
                            weight="bold"
                          />
                        ) : isExcluded ? (
                          <ProhibitIcon
                            className="size-3.5 shrink-0"
                            weight="bold"
                          />
                        ) : (
                          <TagIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 truncate">{tag.name}</span>
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
