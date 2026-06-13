import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSearch } from '@/components/providers/SearchProvider'
import { ArrowsDownUp, Check } from '@phosphor-icons/react'

export function SortPicker({ className }: { className?: string }) {
  const { sortBy, setSortBy, sortOrder, setSortOrder, setIsSearching } = useSearch()

  const options: { label: string; value: 'createdAt' | 'modifiedAt' | 'fileName' }[] = [
    { label: 'Title', value: 'fileName' },
    { label: 'Creation Date', value: 'createdAt' },
    { label: 'Modified Date', value: 'modifiedAt' },
  ]

  const handleSelectSort = (value: 'createdAt' | 'modifiedAt' | 'fileName') => {
    setSortBy(value)
    setIsSearching(true)
  }

  const handleSelectOrder = (order: 'asc' | 'desc') => {
    setSortOrder(order)
    setIsSearching(true)
  }

  // Active if not the default sorting (fileName ASC)
  const isSortedActive = sortBy !== 'fileName' || sortOrder !== 'asc'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'opacity-70 hover:opacity-100 backdrop-blur-none cursor-pointer relative',
            isSortedActive && 'text-primary opacity-100',
            className,
          )}
          title="Sort Options"
        >
          <ArrowsDownUp size={20} />
          {isSortedActive && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-primary ring-1 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-56 p-3 bg-background/95 border border-border/80 shadow-2xl rounded-2xl flex flex-col gap-3"
      >
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none px-1">
          Sort By
        </div>
        <div className="flex flex-col gap-0.5">
          {options.map((opt) => {
            const isSelected = sortBy === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => handleSelectSort(opt.value)}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground/80 hover:text-foreground'
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} weight="bold" />}
              </button>
            )
          })}
        </div>

        <div className="h-px bg-border/40 my-0.5" />

        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none px-1">
          Direction
        </div>
        <div className="grid grid-cols-2 gap-1 px-1">
          <button
            onClick={() => handleSelectOrder('asc')}
            className={cn(
              'px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-center border',
              sortOrder === 'asc'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background hover:bg-muted text-muted-foreground border-border'
            )}
          >
            Asc
          </button>
          <button
            onClick={() => handleSelectOrder('desc')}
            className={cn(
              'px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-center border',
              sortOrder === 'desc'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background hover:bg-muted text-muted-foreground border-border'
            )}
          >
            Desc
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
