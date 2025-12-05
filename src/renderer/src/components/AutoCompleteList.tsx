import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Icon } from '@phosphor-icons/react'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'

export interface AutoCompleteItem<T = string> {
  id: string
  type: T
  title: string
  subtitle?: string
  thumbnail?: string
  count?: number
}

interface ItemType {
  name: string
  icon: Icon
}

interface Props<T> {
  items: AutoCompleteItem<T>[]
  isOpen: boolean
  onSelect: (item: AutoCompleteItem<T>) => void
  types: Record<string, ItemType>
  className?: string
}

export default function AutocompleteList<T = string>({
  items,
  isOpen,
  onSelect,
  types,
  className,
}: Props<T>) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // group items by type
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.type as string]) {
        acc[item.type as string] = []
      }
      acc[item.type as string].push(item)
      return acc
    },
    {} as Record<string, AutoCompleteItem<T>[]>,
  )

  const flatItems = Object.values(groupedItems).flat() as AutoCompleteItem<T>[]

  // reset items change
  useEffect(() => {
    setSelectedIndex(0)
    itemRefs.current = []
  }, [items])

  // keyboard navigation from parent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || flatItems.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev < flatItems.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : flatItems.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (flatItems[selectedIndex]) {
            onSelect(flatItems[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, flatItems, selectedIndex, onSelect])

  // scroll selected item into view
  useEffect(() => {
    const selectedButton = itemRefs.current[selectedIndex]
    if (selectedButton) {
      selectedButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedIndex])

  if (!isOpen || items.length === 0) return null

  return (
    <div
      role="listbox"
      aria-label="Autocomplete suggestions"
      className={cn(
        'absolute top-full left-0 right-0 z-50 mt-2',
        'bg-background/85 backdrop-blur-xl border rounded-xl',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className,
      )}
    >
      <ScrollArea className="max-h-96 flex flex-col overflow-y-auto ">
        <div className="p-2 gap-y-1 grid">
          {Object.entries(groupedItems).map(([type, typeItems], groupIndex) => {
            const { name, icon: Icon } = types[type]

            return (
              <div key={type}>
                {groupIndex > 0 && <Separator className="my-2" />}

                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                  {Icon && <Icon size={14} />}
                  <span>{name || type}</span>
                </div>

                {typeItems.map((item, itemIndex) => {
                  const flatIndex =
                    Object.entries(groupedItems)
                      .slice(0, groupIndex)
                      .reduce((acc, [, items]) => acc + items.length, 0) +
                    itemIndex

                  return (
                    <Button
                      key={item.id}
                      ref={el => {
                        itemRefs.current[flatIndex] = el
                      }}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start h-auto p-2 border-0 bg-transparent',
                        'hover:bg-accent/50 focus:bg-accent/50 focus:outline-2 focus:outline-primary',
                        'text-left cursor-pointer transition-colors',
                        selectedIndex === flatIndex &&
                          'bg-accent/70 ring-2 ring-prioutline-primary/50',
                      )}
                      onClick={() => onSelect(item)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelect(item)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {/* thumbnail or icon */}
                        <div className="shrink-0">
                          <div className="size-9 rounded-sm bg-muted/50 flex items-center justify-center border">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : Icon ? (
                              <Icon
                                size={16}
                                className="text-muted-foreground"
                              />
                            ) : null}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={clsx(
                                'font-medium truncate',
                                !item.subtitle && 'text-lg',
                              )}
                            >
                              {item.title}
                            </span>
                            {item.count && (
                              <span className="text-xs text-muted-foreground me-2">
                                {item.count}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
