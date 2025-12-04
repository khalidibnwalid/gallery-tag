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
  return (
    <div className="absolute z-50 top-17 left-3 right-3 px-4 h-12 w-auto flex items-center justify-center">
      <ImagesSelectionBar />
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
    isSelectionMode && (
      <div className="animate-fade-in flex items-center gap-1 text-lg! text-foreground bg-background/70! px-2 py-1 rounded-lg border-input border backdrop-blur-3xl">
        <Button variant="ghost" onClick={() => toggleSelectionMode()} size="lg">
          <SelectionIcon className="size-4" />
          {isSelectionMode ? 'Exit Selection' : 'Select Images'}
        </Button>

        {isSelectionMode && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={onSelectAll} size="lg">
              {isAllSelected ? (
                <CheckSquareIcon className="size-4" />
              ) : (
                <SquareIcon className="size-4" />
              )}
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>

            <Button variant="ghost" onClick={clearSelection} size="lg">
              <XIcon className="size-4" />
              Clear
            </Button>
          </div>
        )}
        <Button variant="ghost" size="lg">
          {selectedImageIds.size} of {images.length} selected
        </Button>
      </div>
    )
  )
}
