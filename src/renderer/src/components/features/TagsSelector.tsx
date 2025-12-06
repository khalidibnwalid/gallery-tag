import { useAddTagsToImageMutation, useTags } from '@/lib/queries/tags'
import { ImageData } from '@/lib/types/image'
import { TagData } from '@/lib/types/tag'
import { TagIcon } from '@phosphor-icons/react'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { ScrollArea } from '../ui/scroll-area'
import { Spinner } from '../ui/spinner'

interface Props {
  children: React.ReactNode
  imageIds: ImageData['id'] | ImageData['id'][]
  currentTags?: string[]
}

export function TagSelector({ children, currentTags = [], imageIds }: Props) {
  imageIds = Array.isArray(imageIds) ? imageIds : [imageIds]

  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [addedTagsIds, setAddedTagsIds] = useState<Set<TagData['id']>>(
    new Set(),
  )

  const { data: allTags, isLoading } = useTags()

  // filter tags based on search query and exclude existing tags
  const filteredTags =
    allTags?.filter(
      tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !currentTags.includes(tag.name),
    ) || []

  // all selectable options (filtered tags + create option)
  const allOptions = [
    ...filteredTags,
    ...(searchQuery.length > 0 &&
    !allTags?.some(tag => tag.name.toLowerCase() === searchQuery.toLowerCase())
      ? [{ name: searchQuery, isCreate: true }]
      : []),
  ]

  const { mutateAsync, isPending } = useAddTagsToImageMutation({
    onSuccess: tags => {
      console.log('Tags added:', tags)
      setAddedTagsIds(prev => new Set([...prev, ...tags.map(tag => tag.id)]))
    },
  })
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const onTagSelect = async (tag: TagData | string) => {
    console.log('Tag selected:', tag)
    if (isPending || (typeof tag === 'string' && !tag.trim())) return

    await mutateAsync({
      tags: [typeof tag === 'string' ? { name: tag } : tag],
      imageIds,
    })

    // setOpen(false)
    // setSearchQuery('')
    // setSelectedIndex(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < allOptions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : allOptions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        console.log('Enter key pressed, selectedIndex:', selectedIndex)
        if (selectedIndex >= 0 && selectedIndex < allOptions.length) {
          const selectedOption = allOptions[selectedIndex]
          console.log('Enter key pressed, selecteOpt:', selectedOption)
          console.log('Selected option:', selectedOption)
          onTagSelect(
            'isCreate' in selectedOption && selectedOption.isCreate
              ? selectedOption.name
              : (selectedOption as TagData),
          )
          // unnecessary...
        } else if (searchQuery) {
          onTagSelect(searchQuery)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  // scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && optionRefs.current[selectedIndex]) {
      optionRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedIndex])

  // reset index when options change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredTags.length, searchQuery])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 rounded-4xl p-3" align="end">
        <div
          className="space-y-3"
          onClick={e => e.stopPropagation()}
          onKeyDown={onKeyDown}
        >
          <Input
            placeholder="Search or Create tags..."
            startContent={
              isPending ? (
                <Spinner />
              ) : (
                <TagIcon className="size-4 text-muted-foreground" />
              )
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-10 w-full"
          />

          <ScrollArea className="max-h-48 flex flex-col overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner className="size-6" />
              </div>
            ) : filteredTags.length > 0 ||
              (searchQuery.length > 0 &&
                !allTags?.some(
                  tag => tag.name.toLowerCase() === searchQuery.toLowerCase(),
                )) ? (
              <div className="space-y-1">
                {filteredTags.map((tag, index) => (
                  <Button
                    key={tag.id}
                    ref={el => {
                      optionRefs.current[index] = el
                    }}
                    variant={selectedIndex === index ? 'outline' : 'ghost'}
                    size="sm"
                    className={clsx(
                      'w-full justify-start h-10 px-4 font-bold',
                      {
                        'bg-success/80! text-foreground pointer-events-none':
                          addedTagsIds.has(tag.id),
                      },
                    )}
                    onClick={() => onTagSelect(tag)}
                    disabled={addedTagsIds.has(tag.id)}
                  >
                    {tag.name}
                  </Button>
                ))}
                {searchQuery.length > 0 &&
                  !allTags?.some(
                    tag => tag.name.toLowerCase() === searchQuery.toLowerCase(),
                  ) && (
                    <Button
                      ref={el => {
                        optionRefs.current[filteredTags.length] = el
                      }}
                      variant={
                        selectedIndex === filteredTags.length
                          ? 'outline'
                          : 'ghost'
                      }
                      size="sm"
                      className="w-full justify-start h-10 px-4 font-bold"
                      onClick={() => onTagSelect(searchQuery)}
                    >
                      Create "{searchQuery}"
                    </Button>
                  )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-4">
                {searchQuery
                  ? 'No tags found matching your search'
                  : 'No available tags'}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
