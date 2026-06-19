import {
  useAddTagsToImageMutation,
  useRemoveTagsFromImageMutation,
  useSuggestedTagsQuery,
  useTags,
} from '@/lib/queries/tags'
import { ImageData } from '@/lib/types/image'
import { TagData } from '@/lib/types/tag'
import { PlusIcon, SparkleIcon, TagIcon } from '@phosphor-icons/react'
import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { ScrollArea } from '../../ui/scroll-area'
import { Spinner } from '../../ui/spinner'

interface Props {
  children: React.ReactNode
  imageIds: ImageData['id'] | ImageData['id'][]
  currentTags?: TagData['name'][]
}

const getAncestors = (tagId: number, allTags: TagData[]): number[] => {
  const ancestors: number[] = []
  let currentId: number | null = tagId
  while (currentId !== null) {
    const tag = allTags.find(t => t.id === currentId)
    if (!tag || !tag.parentId) break
    ancestors.push(tag.parentId)
    currentId = tag.parentId
  }
  return ancestors
}

export function TagSelector({ children, currentTags = [], imageIds }: Props) {
  imageIds = Array.isArray(imageIds) ? imageIds : [imageIds]
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const { data: allTags = [], isLoading } = useTags()
  const singleImageId = imageIds.length === 1 ? imageIds[0] : undefined
  const { data: suggestedTags = [], isLoading: isSuggestionsLoading } =
    useSuggestedTagsQuery({
      imageId: singleImageId,
      currentTags,
      enabled: open && !searchQuery.trim(),
    })

  const currentTagsKey = currentTags.join(',')
  const currentTagsData = useMemo(() => {
    return (allTags?.filter(tag => currentTags.includes(tag.name)) as TagData[]) || []
  }, [allTags, currentTagsKey])

  const filteredTags = useMemo(
    () =>
      allTags?.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ) || [],
    [allTags, searchQuery],
  )

  const displayedTags = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()
    const filteredSuggestedTags = suggestedTags.filter(tag =>
      search ? tag.name.toLowerCase().includes(search) : true,
    )
    const suggestedTagIds = new Set(filteredSuggestedTags.map(tag => tag.id))

    return [
      ...filteredSuggestedTags,
      ...filteredTags.filter(tag => !suggestedTagIds.has(tag.id)),
    ]
  }, [filteredTags, searchQuery, suggestedTags])

  // for user feedback purposes
  // the addedTagsIds is not needed since we got currentTags, but it's easier this way using Set.has(id) method
  const [addedTagsIds, setAddedTagsIds] = useState<Set<TagData['id']>>(() => {
    const initialSet = new Set<TagData['id']>()
    currentTagsData.forEach(tag => {
      initialSet.add(tag.id)
      let currentParentId: number | undefined = tag.parentId ?? undefined
      while (currentParentId) {
        initialSet.add(currentParentId)
        const parentTag = allTags.find(t => t.id === currentParentId)
        currentParentId = parentTag?.parentId ?? undefined
      }
    })
    return initialSet
  })
  const [deletedTagsIds, setDeletedTagsIds] = useState<Set<TagData['id']>>(
    new Set(),
  )

  // all selectable options (tags + create option)
  const allOptions = [
    ...displayedTags,
    ...(searchQuery.length > 0 &&
    !allTags?.some(tag => tag.name.toLowerCase() === searchQuery.toLowerCase())
      ? [{ name: searchQuery, isCreate: true }]
      : []),
  ]

  const { mutateAsync: addTagsAsync, isPending: isAddingPending } =
    useAddTagsToImageMutation({
      onSuccess: tags => {
        setAddedTagsIds(prev => {
          const next = new Set(prev)
          tags.forEach(tag => {
            next.add(tag.id)
            getAncestors(tag.id, allTags).forEach(ancestorId => next.add(ancestorId))
          })
          return next
        })
        setDeletedTagsIds(prev => {
          const next = new Set(prev)
          tags.forEach(tag => {
            next.delete(tag.id)
            getAncestors(tag.id, allTags).forEach(ancestorId => next.delete(ancestorId))
          })
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
  const isBusy = isPending || isLoading || isSuggestionsLoading

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
    e.stopPropagation()

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
  }, [displayedTags.length, searchQuery])

  useEffect(() => {
    if (open) return

    setSearchQuery('')
    setSelectedIndex(-1)

    const initialSet = new Set<TagData['id']>()
    currentTagsData.forEach(tag => {
      initialSet.add(tag.id)
      getAncestors(tag.id, allTags).forEach(ancestorId => initialSet.add(ancestorId))
    })

    setAddedTagsIds(initialSet)
    setDeletedTagsIds(new Set())
  }, [open, currentTagsData, allTags])

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
              isBusy ? (
                <Spinner />
              ) : (
                <TagIcon className="size-4 text-muted-foreground" />
              )
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-10 w-full"
          />

          <ScrollArea className="max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner className="size-8" />
              </div>
            ) : displayedTags.length > 0 ||
              (searchQuery.length > 0 &&
                !allTags?.some(
                  tag => tag.name.toLowerCase() === searchQuery.toLowerCase(),
                )) ? (
              <div className="flex flex-wrap gap-2">
                {displayedTags.map((tag, index) => {
                  const isAdded = addedTagsIds.has(tag.id)
                  const isDeleted = deletedTagsIds.has(tag.id)
                  const isSuggested =
                    !searchQuery.trim() &&
                    suggestedTags.some(suggested => suggested.id === tag.id)

                  return (
                    <Button
                      key={tag.id}
                      ref={el => {
                        optionRefs.current[index] = el
                      }}
                      variant={selectedIndex === index ? 'outline' : 'ghost'}
                      size="sm"
                      className={clsx(
                        'h-8 max-w-full justify-start gap-1.5 bg-primary/5  hover:opacity-70 rounded-full px-3 font-bold',
                        isAdded && 'bg-success! text-foreground',
                        isDeleted && 'bg-destructive! text-foreground',
                      )}
                      onClick={() => onTagSelect(tag)}
                      disabled={isPending}
                    >
                      {isSuggested && !isAdded && (
                        <SparkleIcon
                          className="size-3.5 shrink-0"
                          weight="bold"
                        />
                      )}
                      {!isSuggested && !isAdded && (
                        <PlusIcon className="size-3.5 shrink-0" weight="bold" />
                      )}
                      <span className="min-w-0 truncate">{tag.name}</span>
                    </Button>
                  )
                })}
                {searchQuery.trim().length > 0 &&
                  !allTags?.some(
                    tag => tag.name.toLowerCase() === searchQuery.toLowerCase(),
                  ) && (
                    <Button
                      ref={el => {
                        optionRefs.current[displayedTags.length] = el
                      }}
                      variant={
                        selectedIndex === displayedTags.length
                          ? 'outline'
                          : 'ghost'
                      }
                      size="sm"
                      className="h-8 max-w-full justify-start gap-1.5 rounded-full px-3 font-bold"
                      onClick={() => onTagSelect(searchQuery)}
                    >
                      <PlusIcon className="size-3.5 shrink-0" weight="bold" />
                      <span className="min-w-0 truncate">
                        Create "{searchQuery}"
                      </span>
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
