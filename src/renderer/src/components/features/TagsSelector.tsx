import {
  useAddTagsToImageMutation,
  useRemoveTagsFromImageMutation,
  useTags,
} from '@/lib/queries/tags'
import { ImageData } from '@/lib/types/image'
import { TagData } from '@/lib/types/tag'
import { CheckIcon, TagIcon, XIcon } from '@phosphor-icons/react'
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
  currentTags?: TagData['name'][]
}

export function TagSelector({ children, currentTags = [], imageIds }: Props) {
  imageIds = Array.isArray(imageIds) ? imageIds : [imageIds]
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const { data: allTags = [], isLoading } = useTags()

  const currentTagsData =
    (allTags?.filter(tag => currentTags.includes(tag.name)) as TagData[]) || []

  const filteredTags =
    allTags?.filter(tag =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || []

  // for user feedback purposes
  // the addedTagsIds is not needed since we got currentTags, but it's easier this way using Set.has(id) method
  const [addedTagsIds, setAddedTagsIds] = useState<Set<TagData['id']>>(
    new Set(currentTagsData.map(tag => tag.id)),
  )
  const [deletedTagsIds, setDeletedTagsIds] = useState<Set<TagData['id']>>(
    new Set(),
  )

  // all selectable options (tags + create option)
  const allOptions = [
    ...filteredTags,
    ...(searchQuery.length > 0 &&
    !allTags?.some(tag => tag.name.toLowerCase() === searchQuery.toLowerCase())
      ? [{ name: searchQuery, isCreate: true }]
      : []),
  ]

  const { mutateAsync: addTagsAsync, isPending: isAddingPending } =
    useAddTagsToImageMutation({
      onSuccess: tags => {
        setAddedTagsIds(prev => new Set([...prev, ...tags.map(tag => tag.id)]))
        setDeletedTagsIds(prev => {
          const next = new Set(prev)
          tags.forEach(tag => next.delete(tag.id))
          return next
        })
      },
    })

  const { mutateAsync: removeTagsAsync, isPending: isRemovingPending } =
    useRemoveTagsFromImageMutation({
      onSuccess: ({ tagIds }) => {
        setDeletedTagsIds(prev => new Set([...prev, ...tagIds]))
        setAddedTagsIds(prev => {
          const next = new Set(prev)
          tagIds.forEach(id => next.delete(id))
          return next
        })
      },
    })

  const isPending = isAddingPending || isRemovingPending

  const onTagSelect = async (tag: TagData | string) => {
    if (isPending || (typeof tag === 'string' && !tag.trim())) return
    // Create new tag
    if (typeof tag === 'string') {
      await addTagsAsync({
        tags: [{ name: tag }],
        imageIds,
      })
      return
    }

    if (addedTagsIds.has(tag.id)) {
      await removeTagsAsync({
        tagIds: [tag.id],
        imageIds,
      })
    } else {
      await addTagsAsync({
        tags: [tag],
        imageIds,
      })
    }
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
        if (selectedIndex >= 0 && selectedIndex < allOptions.length) {
          const selectedOption = allOptions[selectedIndex]
          onTagSelect(
            'isCreate' in selectedOption && selectedOption.isCreate
              ? selectedOption.name
              : (selectedOption as TagData),
          )
          setSearchQuery('')
          setSelectedIndex(-1)
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

  useEffect(() => {
    if (open) return

    setSearchQuery('')
    setSelectedIndex(-1)
    setAddedTagsIds(new Set(currentTagsData.map(tag => tag.id)))
    setDeletedTagsIds(new Set())
  }, [open])

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
                <Spinner className="size-8" />
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
                      addedTagsIds.has(tag.id) && 'bg-success! text-foreground',
                      deletedTagsIds.has(tag.id) &&
                        'bg-destructive! text-foreground',
                    )}
                    onClick={() => onTagSelect(tag)}
                    disabled={isPending}
                  >
                    {addedTagsIds.has(tag.id) && (
                      <CheckIcon className="size-4" weight="bold" />
                    )}
                    {deletedTagsIds.has(tag.id) && (
                      <XIcon className="size-4" weight="bold" />
                    )}
                    {tag.name}
                  </Button>
                ))}
                {searchQuery.trim().length > 0 &&
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
