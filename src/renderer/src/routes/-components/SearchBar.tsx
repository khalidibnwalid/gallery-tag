import { useSearch } from '@/components/providers/SearchProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import useDebounce from '@/lib/hooks/useDebounce'
import {
  FadersIcon,
  MagnifyingGlassIcon,
  PaletteIcon,
  TagIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import AutocompleteList from '../../components/AutocompleteList'

const types = {
  recent: { name: 'Recent Searches', icon: MagnifyingGlassIcon },
  tag: { name: 'Tags', icon: TagIcon },
  folder: { name: 'Folders', icon: PaletteIcon },
  image: { name: 'Images', icon: FadersIcon },
}

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false)
  const { setSearchQuery, setIsSearching } = useSearch()

  const debouncedSearch = useDebounce(search, 300)

  function search(value: string = '') {
    setSearchQuery(value)
    setIsSearching(value.length > 0)
  }
  const [searchValue, _setSearchValue] = useState('')
  const setSearchValue = (value: string) => {
    _setSearchValue(value)
    setIsOpen(value.length > 0)
    debouncedSearch(value)
  }

  const onClear = () => setSearchValue('')

  // TODO
  const onSelect = (item: any) => {
    _setSearchValue(item.title)
    setIsOpen(false)
  }

  const items = []

  return (
    <div className="relative">
      <Input
        tabIndex={1}
        value={searchValue}
        onValueChange={setSearchValue}
        onFocus={() => searchValue.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        startContent={
          <MagnifyingGlassIcon size={24} className="backdrop-blur-none" />
        }
        endContent={
          <div className="flex items-center">
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
            <Button
              variant="ghost"
              size="icon"
              className="opacity-70 hover:opacity-100 backdrop-blur-none"
            >
              <TagIcon size={20} color="currentColor" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-70 hover:opacity-100 backdrop-blur-none"
            >
              <PaletteIcon size={20} color="currentColor" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-70 hover:opacity-100 backdrop-blur-none"
            >
              <FadersIcon size={20} color="currentColor" />
            </Button>
          </div>
        }
        className="h-12 ps-11 text-lg! text-foreground bg-background/70!"
        size="lg"
        placeholder="Search..."
      />

      <AutocompleteList
        types={types}
        items={items}
        isOpen={isOpen}
        onSelect={onSelect}
      />
    </div>
  )
}
