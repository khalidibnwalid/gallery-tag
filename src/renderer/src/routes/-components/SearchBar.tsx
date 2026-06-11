import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ColorPicker } from '@/components/features/ColorPicker'
import useDebounce from '@/lib/hooks/useDebounce'
import {
  useCreateTagMutation,
  useTags,
  useTagsSearchQuery,
} from '@/lib/queries/tags'
import { TagData } from '@/lib/types/tag'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import AutocompleteList, {
  AutoCompleteItem,
} from '../../components/AutoCompleteList'

const autoCompleteTypes = {
  tag: { name: 'Tags', icon: TagIcon },
  'create-tag': { name: 'Create Tag', icon: PlusIcon },
}

type ItemType = keyof typeof autoCompleteTypes

export default function SearchBar() {
  const { setSearchQuery, setIsSearching, searchColor, setSearchColor } =
    useSearch()
  const { folderPath } = useFolder()

  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, _setSearchValue] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  const setSearchValue = (value: string) => {
    _setSearchValue(value)
    setIsOpen(value.length > 0)
    debouncedSearch(value)
  }

  const { data: allTags = [] } = useTags()
  const { data: searchedTags = [] } = useTagsSearchQuery(
    searchValue,
    searchValue.length > 0,
  )

  const createTagMutation = useCreateTagMutation()

  function search(value: string = '') {
    setSearchQuery(value)
    setIsSearching(value.length > 0)
  }

  const onClear = () => setSearchValue('')

  const onSelect = async (item: AutoCompleteItem<ItemType>) => {
    switch (item.type) {
      case 'create-tag':
        try {
          await createTagMutation.mutateAsync({ name: searchValue })
          // after creation, search for the new tag
          _setSearchValue(searchValue)
          search(searchValue)
          console.log('Tag created successfully:', searchValue)
        } catch (error) {
          console.error('Failed to create tag:', error)
        }
        break
      default:
        _setSearchValue(item.title)
        search(item.title)
    }
    setIsOpen(false)
  }

  function tagToItem(tag: TagData): AutoCompleteItem<'tag'> {
    return {
      id: `tag-${tag.id}`,
      type: 'tag',
      title: tag.name,
      subtitle: `Tag • ${
        tag.createdAt ? new Date(tag.createdAt).toLocaleDateString() : ''
      }`,
    }
  }

  const tagItems: AutoCompleteItem<'tag'>[] = searchedTags.map(tag =>
    tagToItem(tag),
  )

  const autoCompleteItems: AutoCompleteItem<ItemType>[] =
    searchValue.trim().length > 0
      ? [...tagItems]
      : allTags.map(tag => tagToItem(tag))

  // create tag option
  if (
    searchValue.length > 0 &&
    searchValue.trim().length > 0 &&
    !searchedTags.some(
      tag => tag.name.toLowerCase() === searchValue.toLowerCase(),
    )
  ) {
    autoCompleteItems.push({
      id: 'create-tag',
      type: 'create-tag',
      title: `Create "${searchValue}"`,
      subtitle: 'Create a new tag',
    })
  }

  return (
    <div className="relative">
      <Input
        className="h-12 ps-11 text-lg! text-foreground bg-background/70!"
        size="lg"
        placeholder="Search..."
        disabled={!folderPath}
        tabIndex={1}
        value={searchValue}
        onValueChange={setSearchValue}
        onFocus={() => searchValue.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        startContent={
          <MagnifyingGlassIcon size={24} className="backdrop-blur-none" />
        }
        endContent={
          <div className="flex items-center gap-2 select-none">
            {searchValue.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="opacity-70 hover:opacity-100 backdrop-blur-none"
              >
                <XIcon size={20} color="currentColor" />
              </Button>
            )}
            <ColorPicker
              value={searchColor}
              onChange={color => {
                setSearchColor(color)
                if (color) setIsSearching(true)
              }}
            />
            {searchColor && (
              <div
                className="size-5 rounded-full border border-foreground/30 relative group cursor-pointer shadow-xs animate-fade-in transition-all hover:scale-105"
                style={{ backgroundColor: searchColor }}
                title="Active color search filter. Click to clear."
                onClick={e => {
                  e.stopPropagation()
                  setSearchColor(null)
                }}
              >
                <span className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow-xs">
                  ✕
                </span>
              </div>
            )}
          </div>
        }
      />

      <AutocompleteList
        types={autoCompleteTypes}
        items={autoCompleteItems}
        isOpen={isOpen}
        onSelect={onSelect}
      />
    </div>
  )
}
