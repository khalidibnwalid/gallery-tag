import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FadersIcon,
  MagnifyingGlassIcon,
  PaletteIcon,
  TagIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import AutocompleteList from '../../components/AutocompleteList'

const mockItems = [
  {
    id: '1',
    type: 'recent' as const,
    title: 'beach sunset',
    subtitle: 'Last searched 2 hours ago',
  },
  {
    id: '2',
    type: 'tag' as const,
    title: 'nature',
    count: 156,
  },
  {
    id: '3',
    type: 'folder' as const,
    title: 'Vacation Photos',
    subtitle: '/Photos/2023/Summer',
    count: 42,
  },
  {
    id: '4',
    type: 'image' as const,
    title: 'IMG_5847.jpg',
    subtitle: 'Modified today',
    thumbnail: 'https://picsum.photos/32/32?random=1',
  },
  {
    id: '4',
    type: 'image' as const,
    title: 'IMG_5847.jpg',
    subtitle: 'Modified today',
    thumbnail: 'https://picsum.photos/32/32?random=1',
  },

  {
    id: '4',
    type: 'image' as const,
    title: 'IMG_5847.jpg',
    subtitle: 'Modified today',
    thumbnail: 'https://picsum.photos/32/32?random=1',
  },
]

const types = {
  recent: { name: 'Recent Searches', icon: MagnifyingGlassIcon },
  tag: { name: 'Tags', icon: TagIcon },
  folder: { name: 'Folders', icon: PaletteIcon },
  image: { name: 'Images', icon: FadersIcon },
}

export default function SearchBar() {
  const [searchValue, setSearchValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const onSearch = (value: string) => {
    setSearchValue(value)
    setIsOpen(value.length > 0)
  }

  const onSelect = (item: any) => {
    setSearchValue(item.title)
    setIsOpen(false)

    // selection logic
  }

  return (
    <div className="relative">
      <Input
        tabIndex={1}
        value={searchValue}
        onValueChange={onSearch}
        onFocus={() => searchValue.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        startContent={
          <MagnifyingGlassIcon size={24} className="backdrop-blur-none" />
        }
        endContent={
          <div className="flex items-center">
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
        items={mockItems}
        isOpen={isOpen}
        onSelect={onSelect}
      />
    </div>
  )
}
