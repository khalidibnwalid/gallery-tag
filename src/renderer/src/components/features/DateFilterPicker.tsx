import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSearch } from '@/components/providers/SearchProvider'
import { CalendarIcon } from '@phosphor-icons/react'

export function DateFilterPicker({ className }: { className?: string }) {
  const {
    createdStart,
    setCreatedStart,
    createdEnd,
    setCreatedEnd,
    modifiedStart,
    setModifiedStart,
    modifiedEnd,
    setModifiedEnd,
    setIsSearching,
  } = useSearch()

  const hasCreatedFilter = !!(createdStart || createdEnd)
  const hasModifiedFilter = !!(modifiedStart || modifiedEnd)
  const hasAnyFilter = hasCreatedFilter || hasModifiedFilter

  const formatDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const applyPreset = (
    type: 'created' | 'modified',
    preset: 'today' | '7days' | '30days' | 'clear',
  ) => {
    const end = new Date()
    const start = new Date()

    if (preset === 'today') {
      // start and end are today
    } else if (preset === '7days') {
      start.setDate(start.getDate() - 7)
    } else if (preset === '30days') {
      start.setDate(start.getDate() - 30)
    }

    if (preset === 'clear') {
      if (type === 'created') {
        setCreatedStart('')
        setCreatedEnd('')
      } else {
        setModifiedStart('')
        setModifiedEnd('')
      }
    } else {
      if (type === 'created') {
        setCreatedStart(formatDate(start))
        setCreatedEnd(formatDate(end))
      } else {
        setModifiedStart(formatDate(start))
        setModifiedEnd(formatDate(end))
      }
      setIsSearching(true)
    }
  }

  const handleClearAll = () => {
    setCreatedStart('')
    setCreatedEnd('')
    setModifiedStart('')
    setModifiedEnd('')
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'opacity-70 hover:opacity-100 backdrop-blur-none cursor-pointer relative',
            hasAnyFilter && 'text-primary opacity-100',
            className,
          )}
          title="Filter by Dates"
        >
          <CalendarIcon size={20} weight={hasAnyFilter ? 'fill' : 'regular'} />
          {hasAnyFilter && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-primary ring-1 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-72 p-4 bg-background/95 border border-border/80 shadow-2xl rounded-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <span className="font-semibold text-sm select-none">
            Date Filters
          </span>
          {hasAnyFilter && (
            <button
              onClick={handleClearAll}
              className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Created Date Section */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              Created Date
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => applyPreset('created', 'today')}
                className="px-1.5 py-0.5 rounded text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset('created', '7days')}
                className="px-1.5 py-0.5 rounded text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors"
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => applyPreset('created', '30days')}
                className="px-1.5 py-0.5 rounded text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors"
              >
                30D
              </button>
              {hasCreatedFilter && (
                <button
                  type="button"
                  onClick={() => applyPreset('created', 'clear')}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium transition-colors"
                  title="Clear Created Filter"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground select-none">
                From
              </span>
              <Input
                type="date"
                value={createdStart}
                onChange={e => {
                  setCreatedStart(e.target.value)
                  setIsSearching(true)
                }}
                className="h-8 text-xs bg-background/50 border-border! focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground select-none">
                To
              </span>
              <Input
                type="date"
                value={createdEnd}
                onChange={e => {
                  setCreatedEnd(e.target.value)
                  setIsSearching(true)
                }}
                className="h-8 text-xs bg-background/50 border-border! focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-border/40 my-0.5" />

        {/* Modified Date Section */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              Modified Date
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => applyPreset('modified', 'today')}
                className="px-1.5 py-0.5 rounded text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset('modified', '7days')}
                className="px-1.5 py-0.5 rounded text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors"
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => applyPreset('modified', '30days')}
                className="px-1.5 py-0.5 rounded text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors"
              >
                30D
              </button>
              {hasModifiedFilter && (
                <button
                  type="button"
                  onClick={() => applyPreset('modified', 'clear')}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium transition-colors"
                  title="Clear Modified Filter"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground select-none">
                From
              </span>
              <Input
                type="date"
                value={modifiedStart}
                onChange={e => {
                  setModifiedStart(e.target.value)
                  setIsSearching(true)
                }}
                className="h-8 text-xs bg-background/50 border-border! focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground select-none">
                To
              </span>
              <Input
                type="date"
                value={modifiedEnd}
                onChange={e => {
                  setModifiedEnd(e.target.value)
                  setIsSearching(true)
                }}
                className="h-8 text-xs bg-background/50 border-border! focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
