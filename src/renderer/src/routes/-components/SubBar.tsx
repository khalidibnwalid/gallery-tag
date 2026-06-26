import { TagSelector } from '@/components/features/tags/TagsSelector'
import { Button } from '@/components/ui/button'
import { useSelectionStore } from '@/lib/store/selection'
import { ImageData } from '@/lib/types/image'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { RenameImageDialog } from '@/components/cards/ImageCard'
import { useDeleteImagesMutation } from '@/lib/queries/images'
import { useSearch } from '@/components/providers/SearchProvider'
import {
  CheckSquareIcon,
  SelectionIcon,
  SquareIcon,
  TagIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react'

interface SubBarProps {
  images: ImageData[]
  total: number
}

export default function SubBar({ images, total }: SubBarProps) {
  const showBar = useSelectionStore(state => state.isSelectionMode)
  const isDeleteDialogOpen = useSelectionStore(state => state.isDeleteDialogOpen)
  const setDeleteDialogOpen = useSelectionStore(state => state.setDeleteDialogOpen)
  const renamingImageId = useSelectionStore(state => state.renamingImageId)
  const setRenamingImageId = useSelectionStore(state => state.setRenamingImageId)
  const selectedImageIds = useSelectionStore(state => state.selectedItems)
  const selectionQuery = useSelectionStore(state => state.selectionQuery)
  const clearSelection = useSelectionStore(state => state.clearSelection)

  const deleteMutation = useDeleteImagesMutation()

  if (!showBar) return null

  const handleDeleteAction = () => {
    const payload = selectionQuery
      ? { filter: selectionQuery }
      : Array.from(selectedImageIds)

    deleteMutation.mutate(payload, {
      onSuccess: () => {
        clearSelection()
        setDeleteDialogOpen(false)
      },
    })
  }

  const selectedCount = selectionQuery ? total : selectedImageIds.size
  const deleteMessage =
    selectedCount === 1
      ? 'Are you sure you want to move this image to trash?'
      : `Are you sure you want to move ${selectedCount} images to trash?`

  const renamingImage = renamingImageId
    ? images.find(img => img.id === renamingImageId)
    : null

  return (
    <>
      <div className="absolute z-50 top-17 left-3 right-3 px-4 min-h-12 w-auto flex items-center justify-center">
        <div className="animate-fade-in flex items-center gap-1 text-lg! text-foreground bg-background/70! px-2 py-1 rounded-lg border-input border backdrop-blur-3xl">
          <ImagesSelectionBar images={images} total={total} />
        </div>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Move to Trash"
        description={deleteMessage}
        actionLabel={
          selectedCount === 1
            ? 'Delete Image'
            : `Delete ${selectedCount} Images`
        }
        onAction={handleDeleteAction}
      />

      {renamingImage && (
        <RenameImageDialog
          image={renamingImage}
          open={!!renamingImageId}
          onOpenChange={open => !open && setRenamingImageId(null)}
        />
      )}
    </>
  )
}

function ImagesSelectionBar({ images, total }: SubBarProps) {
  const isSelectionMode = useSelectionStore(state => state.isSelectionMode)
  const selectedImageIds = useSelectionStore(state => state.selectedItems)
  const selectionQuery = useSelectionStore(state => state.selectionQuery)
  const toggleSelectionMode = useSelectionStore(
    state => state.toggleSelectionMode,
  )
  const clearSelection = useSelectionStore(state => state.clearSelection)
  const selectAll = useSelectionStore(state => state.selectAll)
  const setDeleteDialogOpen = useSelectionStore(state => state.setDeleteDialogOpen)
  const { filter } = useSearch()

  if (!isSelectionMode) return null

  const isAllLoaded =
    images.length > 0 && images.every(image => selectedImageIds.has(image.id))
  const isAllSelected = !!selectionQuery || (isAllLoaded && selectedImageIds.size >= total)

  const onSelectAll = () => {
    if (isAllSelected) {
      clearSelection()
      return
    }
    if (images.length > 0) selectAll(images.map(image => image.id), filter)
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

        <Button
          variant="ghost"
          onClick={() => (selectedImageIds.size > 0 || !!selectionQuery) && setDeleteDialogOpen(true)}
          size="lg"
          disabled={selectedImageIds.size === 0 && !selectionQuery}
          className="animate-fade-in text-destructive! hover:bg-destructive/15! disabled:opacity-50"
        >
          <TrashIcon className="size-4" />
          Delete
        </Button>
      </div>
      <TagSelector imageIds={selectedImageIdsArray} filter={selectionQuery || undefined}>
        <Button id="subbar-tag-trigger" variant="ghost" size="lg" className="animate-fade-in">
          <TagIcon className="size-4" />
          Add Tags
        </Button>
      </TagSelector>
      <Button variant="ghost" size="lg" className="animate-fade-in px-0.5">
        {selectionQuery ? total : selectedImageIds.size} of {total} selected
      </Button>
    </>
  )
}
