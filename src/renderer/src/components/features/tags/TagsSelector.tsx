import {
  useAddTagsToImageMutation,
  useRemoveTagsFromImageMutation,
  useSuggestedTagsQuery,
  useTags,
} from '@/lib/queries/tags'
import { ImageData } from '@/lib/types/image'
import { TagData } from '@/lib/types/tag'
import { PlusIcon, SparkleIcon, TagIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const pendingAdditionsRef = useRef<
    Map<TagData['id'] | string, TagData | string>
  >(new Map())
  const pendingRemovalsRef = useRef<Set<TagData['id']>>(new Set())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const imageIdsRef = useRef(imageIds)
  useEffect(() => {
    imageIdsRef.current = imageIds
  }, [imageIds])

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
    return (
      (allTags?.filter(tag => currentTags.includes(tag.name)) as TagData[]) ||
      []
    )
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

  const [selectedTagsIds, setSelectedTagsIds] = useState<Set<TagData['id']>>(
    () => {
      const initialSet = new Set<TagData['id']>()
      currentTagsData.forEach(tag => {
        initialSet.add(tag.id)
        getAncestors(tag.id, allTags).forEach(ancestorId =>
          initialSet.add(ancestorId),
        )
      })
      return initialSet
    },
  )

  // all selectable options (tags + create option)
  const allOptions = [
    ...displayedTags,
    ...(searchQuery.length > 0 &&
    !allTags?.some(tag => tag.name.toLowerCase() === searchQuery.toLowerCase())
      ? [{ name: searchQuery, isCreate: true }]
      : []),
  ]

  const { mutateAsync: addTagsAsync } = useAddTagsToImageMutation()
  const { mutateAsync: removeTagsAsync } = useRemoveTagsFromImageMutation()

  const isBusy = isLoading || isSuggestionsLoading

  const flushPendingChanges = useCallback(async () => {
    const additions = Array.from(pendingAdditionsRef.current.values())
    const removals = Array.from(pendingRemovalsRef.current)

    if (additions.length === 0 && removals.length === 0) return

    pendingAdditionsRef.current = new Map()
    pendingRemovalsRef.current = new Set()

    const currentImageIds = Array.isArray(imageIdsRef.current)
      ? imageIdsRef.current
      : [imageIdsRef.current]

    if (additions.length > 0) {
      const tagsPayload = additions.map(tag =>
        typeof tag === 'string' ? { name: tag } : tag,
      )
      await addTagsAsync({
        tags: tagsPayload,
        imageIds: currentImageIds,
      })
    }

    if (removals.length > 0) {
      await removeTagsAsync({
        tagIds: removals,
        imageIds: currentImageIds,
      })
    }
  }, [addTagsAsync, removeTagsAsync])

  const optimisticallyUpdateImageTags = useCallback(
    (tag: TagData | string, isAdding: boolean) => {
      const tagNamesToUpdate = new Set<string>()
      if (typeof tag === 'string') {
        tagNamesToUpdate.add(tag)
      } else {
        tagNamesToUpdate.add(tag.name)
        if (isAdding) {
          getAncestors(tag.id, allTags).forEach(ancestorId => {
            const ancestorTag = allTags.find(t => t.id === ancestorId)
            if (ancestorTag) {
              tagNamesToUpdate.add(ancestorTag.name)
            }
          })
        }
      }

      const idsSet = new Set(
        Array.isArray(imageIdsRef.current)
          ? imageIdsRef.current
          : [imageIdsRef.current],
      )

      queryClient.setQueriesData({ queryKey: ['images'] }, (oldData: any) => {
        if (!oldData) return oldData

        const updateImage = (image: ImageData) => {
          if (!idsSet.has(image.id)) return image

          const currentTagsList = image.tags
            ? image.tags.split(',').map(t => t.trim())
            : []

          let newTagsString = image.tags

          if (isAdding) {
            const toAdd = Array.from(tagNamesToUpdate).filter(
              name => !currentTagsList.includes(name),
            )
            if (toAdd.length > 0) {
              newTagsString = image.tags
                ? `${image.tags}, ${toAdd.join(', ')}`
                : toAdd.join(', ')
            }
          } else {
            const updatedTags = currentTagsList.filter(
              name => !tagNamesToUpdate.has(name),
            )
            newTagsString = updatedTags.join(', ') || undefined
          }

          return {
            ...image,
            tags: newTagsString,
          }
        }

        if (
          typeof oldData === 'object' &&
          'pages' in oldData &&
          Array.isArray(oldData.pages)
        ) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => {
              if (Array.isArray(page)) {
                return page.map(updateImage)
              } else if (
                page &&
                typeof page === 'object' &&
                Array.isArray(page.data)
              ) {
                return {
                  ...page,
                  data: page.data.map(updateImage),
                }
              }
              return page
            }),
          }
        } else if (Array.isArray(oldData)) {
          return oldData.map(updateImage)
        }

        return oldData
      })
    },
    [allTags, queryClient],
  )

  const onTagSelect = (tag: TagData | string) => {
    if (typeof tag === 'string' && !tag.trim()) return

    if (typeof tag === 'string') {
      pendingAdditionsRef.current.set(tag, tag)
      setSearchQuery('')
      optimisticallyUpdateImageTags(tag, true)
    } else {
      const isSelected = selectedTagsIds.has(tag.id)
      if (isSelected) {
        setSelectedTagsIds(prev => {
          const next = new Set(prev)
          next.delete(tag.id)
          return next
        })

        if (pendingAdditionsRef.current.has(tag.id)) {
          pendingAdditionsRef.current.delete(tag.id)
        } else {
          pendingRemovalsRef.current.add(tag.id)
        }
        optimisticallyUpdateImageTags(tag, false)
      } else {
        setSelectedTagsIds(prev => {
          const next = new Set(prev)
          next.add(tag.id)
          getAncestors(tag.id, allTags).forEach(ancestorId =>
            next.add(ancestorId),
          )
          return next
        })

        if (pendingRemovalsRef.current.has(tag.id)) {
          pendingRemovalsRef.current.delete(tag.id)
        } else {
          pendingAdditionsRef.current.set(tag.id, tag)
        }
        optimisticallyUpdateImageTags(tag, true)
      }
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      flushPendingChanges()
    }, 500)
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

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    flushPendingChanges()

    setSearchQuery('')
    setSelectedIndex(-1)

    const initialSet = new Set<TagData['id']>()
    currentTagsData.forEach(tag => {
      initialSet.add(tag.id)
      getAncestors(tag.id, allTags).forEach(ancestorId =>
        initialSet.add(ancestorId),
      )
    })

    setSelectedTagsIds(initialSet)
  }, [open, currentTagsData, allTags, flushPendingChanges])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      flushPendingChanges()
    }
  }, [flushPendingChanges])

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
                  const isSelected = selectedTagsIds.has(tag.id)
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
                        isSelected && 'bg-success! text-foreground',
                      )}
                      onClick={() => onTagSelect(tag)}
                    >
                      {isSuggested && !isSelected && (
                        <SparkleIcon
                          className="size-3.5 shrink-0"
                          weight="bold"
                        />
                      )}
                      {!isSuggested && !isSelected && (
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
