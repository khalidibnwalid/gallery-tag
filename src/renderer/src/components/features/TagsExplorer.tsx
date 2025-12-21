import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { useTags } from '@/lib/queries/tags'
import { cn } from '@/lib/utils'
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  CircleIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'

interface TagsExplorerProps {
  className?: string
  selectedTags?: string[]
  excludedTags?: string[]
  onSelectTags?: (tags: string[]) => void
  onExcludeTags?: (tags: string[]) => void
}

export function TagsExplorer({
  className,
  selectedTags = [],
  excludedTags = [],
  onSelectTags,
  onExcludeTags,
}: TagsExplorerProps) {
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

  const handleTagToggle = (tagName: string) => {
    if (!onSelectTags || !onExcludeTags) return

    const isSelected = selectedTags.includes(tagName)
    const isExcluded = excludedTags.includes(tagName)

    if (isSelected) {
      // Selected -> Excluded
      onSelectTags(selectedTags.filter(t => t !== tagName))
      onExcludeTags([...excludedTags, tagName])
    } else if (isExcluded) {
      // Excluded -> Unchecked
      onExcludeTags(excludedTags.filter(t => t !== tagName))
    } else {
      // Unchecked -> Selected
      onSelectTags([...selectedTags, tagName])
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
        className,
        'border-e-2 border-border h-full flex flex-col transition-all duration-300 bg-background/50 backdrop-blur-sm',
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
        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] uppercase font-bold text-primary hover:text-primary/80"
            onClick={clearSelection}
          >
            Clear ({selectedTags.length + excludedTags.length})
          </Button>
        )}
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

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner className="size-5" />
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No matching tags' : 'No tags found'}
                </div>
              ) : (
                filteredTags.map(tag => {
                  const isSelected = selectedTags.includes(tag.name)
                  const isExcluded = excludedTags.includes(tag.name)

                  return (
                    <Button
                      key={tag.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'w-full justify-start h-10 px-4 font-bold',
                        isSelected && 'bg-primary! text-primary-foreground',
                        isExcluded &&
                          'bg-destructive! text-destructive-foreground',
                      )}
                      onClick={() => handleTagToggle(tag.name)}
                    >
                      {isSelected ? (
                        <CheckIcon className="size-4 mr-2" weight="bold" />
                      ) : isExcluded ? (
                        <ProhibitIcon className="size-4 mr-2" weight="bold" />
                      ) : (
                        <CircleIcon className="size-4 mr-2 text-muted-foreground" />
                      )}
                      {tag.name}
                    </Button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
