import { TagSelector } from '@/components/features/TagsSelector'
import { useFolder } from '@/components/providers/FolderProvider'
import { Button } from '@/components/ui/button'
import { useSelectionStore } from '@/lib/store/selection'
import {
  CheckSquareIcon,
  SelectionIcon,
  SquareIcon,
  TagIcon,
  XIcon,
} from '@phosphor-icons/react'

export default function SubBar() {
  const showBar = useSelectionStore(state => state.isSelectionMode)
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
  const { paginatedImagesQuery } = useFolder()
  const images = paginatedImagesQuery.data!.pages.flat()

  const isSelectionMode = useSelectionStore(state => state.isSelectionMode)
  const selectedImageIds = useSelectionStore(state => state.selectedItems)
  const toggleSelectionMode = useSelectionStore(
    state => state.toggleSelectionMode,
  )
  const clearSelection = useSelectionStore(state => state.clearSelection)
  const selectAll = useSelectionStore(state => state.selectAll)

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

  const selectedImageIdsArray = Array.from(selectedImageIds)

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
      <TagSelector imageIds={selectedImageIdsArray}>
        <Button variant="ghost" size="lg" className="animate-fade-in">
          <TagIcon className="size-4" />
          Add Tags
        </Button>
      </TagSelector>
      <Button variant="ghost" size="lg" className="animate-fade-in px-0.5">
        {selectedImageIds.size} of {images.length} selected
      </Button>
    </>
  )
}
