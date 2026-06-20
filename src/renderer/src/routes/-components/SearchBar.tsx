import { ColorPicker } from '@/components/features/ColorPicker'
import { DateFilterPicker } from '@/components/features/DateFilterPicker'
import { SortPicker } from '@/components/features/SortPicker'
import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import useDebounce from '@/lib/hooks/useDebounce'
import { useClipEnabled } from '@/lib/queries/settings'
import {
  useCreateTagMutation,
  useTags,
  useTagsSearchQuery,
} from '@/lib/queries/tags'
import { TagData } from '@/lib/types/tag'
import { cn } from '@/lib/utils'
import {
  CameraIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparkleIcon,
  TagIcon,
  XIcon,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import AutocompleteList, {
  AutoCompleteItem,
} from '../../components/AutoCompleteList'

const autoCompleteTypes = {
  tag: { name: 'Tags', icon: TagIcon },
  'create-tag': { name: 'Create Tag', icon: PlusIcon },
}

type ItemType = keyof typeof autoCompleteTypes

export default function SearchBar() {
  const {
    setSearchQuery,
    setIsSearching,
    searchColor,
    setSearchColor,
    setAiSearchText,
    aiSearchImage,
    setAiSearchImage,
    setIsSearchDragging,
    createdStart,
    createdEnd,
    modifiedStart,
    modifiedEnd,
    sortBy,
    sortOrder,
    clearSearch,
  } = useSearch()
  const { folderPath } = useFolder()
  const { data: aiEnabledSetting = true } = useClipEnabled(folderPath)

  const [searchMode, setSearchMode] = useState<'keyword' | 'ai'>('keyword')

  useEffect(() => {
    if (!aiEnabledSetting && searchMode === 'ai') {
      setSearchMode('keyword')
      _setSearchValue('')
      setSearchQuery('')
      setAiSearchText('')
      setAiSearchImage(null)
      setIsSearching(false)
    }
  }, [aiEnabledSetting, searchMode])
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, _setSearchValue] = useState('')

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const debouncedAiSearch = useDebounce(aiSearch, 300)

  // Clipboard Paste Handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!folderPath || !aiEnabledSetting) return

      // 1. Try to check for file uri-list first (copied file from File explorer)
      const uriList = e.clipboardData?.getData('text/uri-list')
      if (uriList) {
        const lines = uriList
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
        let found = false
        for (const line of lines) {
          if (line.startsWith('file://')) {
            const filePath = decodeURIComponent(line.substring(7))
            if (/\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(filePath)) {
              setSearchMode('ai')
              setAiSearchImage(filePath)
              found = true
              break
            }
          }
        }
        if (found) {
          e.preventDefault()
          return
        }
      }

      // 2. Try to check for image data items (screenshots, copied image from web)
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue

          const reader = new FileReader()
          reader.onload = async event => {
            try {
              const base64Data = event.target?.result as string
              const tempFilePath =
                await window.api.system.saveTempFile(base64Data)

              setSearchMode('ai')
              setAiSearchImage(tempFilePath)
            } catch (err) {
              console.error('Failed to handle pasted image:', err)
            }
          }
          reader.readAsDataURL(file)
          e.preventDefault()
          break
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [folderPath, aiEnabledSetting])

  const setSearchValue = (value: string) => {
    _setSearchValue(value)
    if (searchMode === 'keyword') {
      setIsOpen(value.length > 0)
      debouncedSearch(value)
    } else {
      debouncedAiSearch(value)
    }
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

  function aiSearch(value: string = '') {
    setAiSearchText(value)
  }

  const toggleSearchMode = () => {
    const newMode = searchMode === 'keyword' ? 'ai' : 'keyword'
    setSearchMode(newMode)
    _setSearchValue('')
    setSearchQuery('')
    setAiSearchText('')
    setAiSearchImage(null)
    setIsSearching(false)
  }

  const handleImageSearch = async () => {
    try {
      const filePath = await window.api.system.openFileDialog()
      if (filePath) {
        setAiSearchImage(filePath)
      }
    } catch (error) {
      console.error('Failed to open image file dialog:', error)
    }
  }

  const onClear = () => {
    _setSearchValue('')
    clearSearch()
  }

  const onSelect = async (item: AutoCompleteItem<ItemType>) => {
    switch (item.type) {
      case 'create-tag':
        try {
          await createTagMutation.mutateAsync({ name: searchValue })
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

  // Drag and Drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!folderPath || !aiEnabledSetting) return
    setIsDragging(true)
    setIsSearchDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setIsSearchDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setIsSearchDragging(false)
    if (!folderPath || !aiEnabledSetting) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const isImg =
        file.type.startsWith('image/') ||
        /\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(file.name)
      if (isImg) {
        const electronFile = file as File & { path?: string }
        if (electronFile.path) {
          const filePath = electronFile.path
          setSearchMode('ai')
          setAiSearchImage(filePath)
        } else {
          // Fallback if path is missing: read file as base64 and save as temp file
          const reader = new FileReader()
          reader.onload = async event => {
            try {
              const base64Data = event.target?.result as string
              const tempFilePath =
                await window.api.system.saveTempFile(base64Data)
              setSearchMode('ai')
              setAiSearchImage(tempFilePath)
            } catch (err) {
              console.error('Failed to handle dropped file fallback:', err)
            }
          }
          reader.readAsDataURL(file)
        }
      }
    } else {
      const uriList = e.dataTransfer.getData('text/uri-list')
      if (uriList) {
        const lines = uriList
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
        for (const line of lines) {
          if (line.startsWith('file://')) {
            const filePath = decodeURIComponent(line.substring(7))
            if (/\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(filePath)) {
              setSearchMode('ai')
              setAiSearchImage(filePath)
              break
            }
          }
        }
      }
    }
  }

  return (
    <div
      className={clsx(
        'relative w-full transition-all duration-300',
        isDragging ? 'h-36' : 'h-12',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && aiEnabledSetting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl backdrop-blur-xs pointer-events-none animate-pulse">
          <CameraIcon size={32} weight="fill" className="text-primary mb-2" />
          <span className="text-sm font-semibold text-primary">
            Drop image to search with AI...
          </span>
        </div>
      )}

      <Input
        className={clsx(
          'h-12 text-lg! text-foreground bg-background/70! transition-all duration-300',
          aiSearchImage ? 'ps-[92px]' : 'ps-12',
          searchMode === 'ai' &&
            'ring-2 ring-primary/50 border-primary/50 shadow-md',
        )}
        size="lg"
        placeholder={
          aiSearchImage
            ? 'Refine search with text...'
            : searchMode === 'ai'
              ? 'Describe image content (AI Search)...'
              : 'Search tags or filenames...'
        }
        disabled={!folderPath}
        tabIndex={1}
        value={searchValue}
        onValueChange={setSearchValue}
        onFocus={() =>
          searchMode === 'keyword' && searchValue.length > 0 && setIsOpen(true)
        }
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        startContent={
          <div className="flex items-center gap-2 select-none">
            {aiEnabledSetting ? (
              <Button
                variant="ghost"
                size="icon"
                disabled={!folderPath}
                onClick={toggleSearchMode}
                className={cn(
                  'size-8 rounded-md transition-all duration-300',
                  searchMode === 'ai'
                    ? 'bg-primary/25 text-primary hover:bg-primary/40 hover:text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
                title={
                  searchMode === 'ai'
                    ? 'Switch to Keyword Search'
                    : 'Switch to AI Semantic Search'
                }
              >
                <SparkleIcon
                  size={18}
                  weight={searchMode === 'ai' ? 'fill' : 'regular'}
                />
              </Button>
            ) : (
              <MagnifyingGlassIcon className="size-6" />
            )}

            {aiSearchImage && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setAiSearchImage(null)
                }}
                className="relative group size-8 rounded-md overflow-hidden border border-primary/40 flex-shrink-0 animate-fade-in shadow-xs cursor-pointer"
                title="Remove image search"
              >
                <img
                  src={`file://${aiSearchImage}`}
                  alt="Search target"
                  className="size-full object-cover group-hover:opacity-40 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                  <XIcon size={14} weight="bold" />
                </div>
              </button>
            )}
          </div>
        }
        endContent={
          <div className="flex items-center gap-2 select-none">
            {searchMode === 'ai' && (
              <Button
                variant="ghost"
                size="icon"
                disabled={!folderPath}
                onClick={handleImageSearch}
                className="opacity-75 hover:opacity-100 text-primary hover:text-primary transition-colors"
                title="Search by image (image-to-image)"
              >
                <CameraIcon size={20} weight="bold" />
              </Button>
            )}
            {(searchValue.length > 0 ||
              aiSearchImage ||
              searchColor ||
              createdStart ||
              createdEnd ||
              modifiedStart ||
              modifiedEnd ||
              sortBy !== 'fileName' ||
              sortOrder !== 'asc') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="opacity-70 hover:opacity-100 backdrop-blur-none cursor-pointer"
              >
                <XIcon size={20} color="currentColor" />
              </Button>
            )}
            <SortPicker />
            <DateFilterPicker />
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

      {searchMode === 'keyword' && (
        <AutocompleteList
          types={autoCompleteTypes}
          items={autoCompleteItems}
          isOpen={isOpen}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}
