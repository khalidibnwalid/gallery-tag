import { useFolder } from '@/components/providers/FolderProvider'
import { useSelection } from '@/components/providers/SelectionProvider'
import { Button } from '@/components/ui/button'
import {
  CheckSquareIcon,
  SelectionIcon,
  SquareIcon,
  XIcon,
} from '@phosphor-icons/react'

export default function SubBar() {
  const { isSelectionMode } = useSelection<number>()

  const showBar = isSelectionMode
  if (!showBar) return null

  return (
    <div className="absolute z-50 top-17 left-3 right-3 px-4 min-h-12 w-auto flex items-center justify-center">
      <div className="animate-fade-in flex items-center gap-1 text-lg! text-foreground bg-background/70! px-2 py-1 rounded-lg border-input border backdrop-blur-3xl">
        <ImagesSelectionBar />
      </div>
    </div>
  )
}

function ImagesSelectionBar() {
  const { folderImagesQuery } = useFolder()
  const images = folderImagesQuery.data!

  const {
    isSelectionMode,
    selectedItems: selectedImageIds,
    toggleSelectionMode,
    clearSelection,
    selectAll,
  } = useSelection<number>()

  if (!isSelectionMode) return null

  const isAllSelected = images
    ? images.length > 0 && images.every(image => selectedImageIds.has(image.id))
    : false

  const onSelectAll = () => {
    if (images) {
      const allImageIds = images.map(image => image.id)
      if (isAllSelected) {
        clearSelection()
        return
      }

      selectAll(allImageIds)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => toggleSelectionMode()}
        size="lg"
        className="animate-fade-in"
      >
        <SelectionIcon className="size-4" />
        {isSelectionMode ? 'Exit Selection' : 'Select Images'}
      </Button>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          onClick={onSelectAll}
          size="lg"
          className="animate-fade-in"
        >
          {isAllSelected ? (
            <CheckSquareIcon className="size-4" />
          ) : (
            <SquareIcon className="size-4" />
          )}
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </Button>

        <Button
          variant="ghost"
          onClick={clearSelection}
          size="lg"
          className="animate-fade-in"
        >
          <XIcon className="size-4" />
          Clear
        </Button>
      </div>
      <Button variant="ghost" size="lg" className="animate-fade-in px-0.5">
        {selectedImageIds.size} of {images.length} selected
      </Button>
    </>
  )
}
