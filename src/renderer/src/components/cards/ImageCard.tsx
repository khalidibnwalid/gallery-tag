import { copyToClipboard, readFromClipboard } from '@/lib/clipboard'
import { useAddTagsToImageMutation, useTags } from '@/lib/queries/tags'
import { useSelectionStore } from '@/lib/store/selection'
import { ImageData } from '@/lib/types/image'
import { TagData } from '@/lib/types/tag'
import { cn } from '@/lib/utils'
import {
  CheckIcon,
  ClipboardIcon,
  FileMagnifyingGlassIcon,
  FolderOpenIcon,
  PlusIcon,
  RocketLaunchIcon,
  TagIcon,
  PencilIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import clsx from 'clsx'
import { MouseEvent, useRef, useState, useEffect } from 'react'
import { TagSelector } from '../features/TagsSelector'
import { Virtualize } from '../features/Virtualize'
import { useFolder } from '../providers/FolderProvider'
import { useLighthouse } from '../providers/LighthouseProvider'
import { useSearch } from '../providers/SearchProvider'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu'
import { ScrollArea } from '../ui/scroll-area'
import {
  useRenameImageMutation,
  useDeleteImagesMutation,
} from '@/lib/queries/images'
import { Input } from '../ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

const TAG_DISPLAY_LIMIT = 5

interface Props {
  image: ImageData
  index: number
}

export default function ImageCard(props: Props) {
  // save image dimensions so it will preserve aspect ratio on re-scroll
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  const aspectRatio =
    props.image.width && props.image.height
      ? `${props.image.width} / ${props.image.height}`
      : undefined

  return (
    <Virtualize
      height={
        aspectRatio
          ? undefined
          : imageDimensions?.height
            ? `${imageDimensions.height}px`
            : '500px'
      }
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <ImageBody
        image={props.image}
        index={props.index}
        setImageDimensions={setImageDimensions}
      />
    </Virtualize>
  )
}

function ImageBody({
  image,
  index,
  setImageDimensions,
}: Props & {
  setImageDimensions: React.Dispatch<
    React.SetStateAction<{
      width: number
      height: number
    } | null>
  >
}) {
  const {
    folderImagesQuery: { data: allImages },
  } = useFolder()
  const { openLighthouse } = useLighthouse()
  const { setSearchColor, setIsSearching } = useSearch()

  const isSelectionMode = useSelectionStore(state => state.isSelectionMode)
  const isSelected = useSelectionStore(state =>
    state.selectedItems.has(image.id),
  )
  const toggleSelection = useSelectionStore(state => state.toggleSelection)
  const toggleSelectionMode = useSelectionStore(
    state => state.toggleSelectionMode,
  )
  const selectRange = useSelectionStore(state => state.selectRange)
  const lastSelectedIndex = useSelectionStore(state => state.lastSelectedIndex)

  const [imageError, setImageError] = useState(false)

  const imgRef = useRef<HTMLImageElement>(null)

  const [showAllTags, setShowAllTags] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)

  const allTags = image.tags ? image.tags.split(',').map(tag => tag.trim()) : []
  const hasMoreTags = allTags.length > TAG_DISPLAY_LIMIT
  const hiddenTagsCount = allTags.length - TAG_DISPLAY_LIMIT
  const visibleTags = showAllTags
    ? allTags
    : allTags.slice(0, TAG_DISPLAY_LIMIT)

  // maintain aspect ratio on unload
  // only if we don't have the dimensions from the db
  const onImageLoad = () => {
    if (image.width && image.height) return

    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current
      const containerWidth = imgRef.current.offsetWidth
      const aspectRatio = naturalHeight / naturalWidth
      const displayHeight = containerWidth * aspectRatio

      setImageDimensions({ width: containerWidth, height: displayHeight })
    }
  }

  const openImage = (e: MouseEvent) => {
    if (isSelectionMode) {
      // shift-click for range selection
      if (e.shiftKey && lastSelectedIndex !== null && allImages) {
        const imageIds = allImages.map(img => img.id)
        selectRange(imageIds, lastSelectedIndex, index)
        return
      }

      toggleSelection(image.id, index)
      return
    } else if (e.ctrlKey || e.metaKey) {
      toggleSelectionMode(true)
      toggleSelection(image.id, index)
      return
    } else if (e.shiftKey && allImages) {
      // enter selection mode and select range from 0 to current
      toggleSelectionMode(true)
      const imageIds = allImages.map(img => img.id)
      selectRange(imageIds, 0, index)
      return
    }

    if (allImages && allImages.length > 0) {
      const startIndex = allImages.findIndex(
        img => img.filePath === image.filePath,
      )
      openLighthouse(
        allImages.map(img => img.filePath),
        startIndex >= 0 ? startIndex : 0,
      )
    } else {
      openLighthouse([image.filePath], 0)
    }
  }

  return (
    <>
      <ImageContextMenu
        image={image}
        onRename={() => setIsRenameDialogOpen(true)}
      >
        <article
          draggable={true}
          onDragStart={e => {
            const selectedItems = useSelectionStore.getState().selectedItems
            if (isSelectionMode && selectedItems.has(image.id)) {
              e.dataTransfer.setData(
                'application/json',
                JSON.stringify({
                  imageIds: Array.from(selectedItems),
                  imageId: image.id,
                  filePath: image.filePath,
                  isBulk: true,
                }),
              )
            } else {
              e.dataTransfer.setData(
                'application/json',
                JSON.stringify({ imageId: image.id, filePath: image.filePath }),
              )
            }
            e.dataTransfer.effectAllowed = 'move'
          }}
          className={cn(
            'border-2 rounded-lg overflow-hidden shadow-md relative group animate-fade-in hover:outline-4 hover:outline-primary cursor-pointer duration-100',
            isSelectionMode &&
              'hover:after:bg-primary/20 after:inset-0 after:absolute after:z-0 ',
            isSelectionMode &&
              isSelected &&
              'outline-6 outline-primary/80 hover:outline-8 after:bg-primary/10',
          )}
          onClick={openImage}
        >
          {isSelectionMode && (
            <div className="absolute top-2 right-2 z-10 duration-100">
              <div
                className={clsx(
                  'size-6 rounded-md border-2 flex items-center justify-center',
                  isSelected ? 'bg-primary-blue' : 'bg-foreground/80',
                )}
              >
                {isSelected && <CheckIcon weight="bold" className="size-4" />}
              </div>
            </div>
          )}
          {/* {image.ai_distance !== undefined && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-semibold font-mono rounded-md bg-indigo-900/90 text-indigo-200 border border-indigo-500/30 shadow-md backdrop-blur-xs select-none">
            Sim: {Math.round(Math.max(0, 1 - (image.ai_distance / 2)) * 100)}% (d: {image.ai_distance.toFixed(3)})
          </div>
        )} */}
          {!imageError ? (
            <img
              ref={imgRef}
              src={`file://${image.thumbnailPath}`}
              alt={image.fileName}
              className="w-full object-cover inset-0 animate-fade-in hover:opacity-95 transition-opacity"
              onLoad={onImageLoad}
              onError={() => {
                console.error('Error loading image:', image.filePath)
                setImageError(true)
              }}
            />
          ) : (
            <div className="w-full min-h-48 h-full flex items-center justify-center bg-muted animate-fade-in">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  Failed to load image
                </p>
                <p className="text-foreground text-xs mt-1">{image.fileName}</p>
              </div>
            </div>
          )}

          <div className="grid gap-1 p-3 bg-background/60 max-h-1/2 backdrop-blur-3xl absolute bottom-0 w-full opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-start justify-between gap-1 min-w-0">
              <div className="flex-1 flex flex-col gap-0.5 min-w-0 overflow-hidden">
                <h2
                  className="text-xl font-semibold truncate"
                  title={image.fileName}
                >
                  {image.fileName}
                </h2>
                {image.width && image.height && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {image.width} × {image.height}
                  </p>
                )}
                {image.dominantColors && image.dominantColors.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    {image.dominantColors.slice(0, 5).map((color, colorIdx) => (
                      <button
                        key={colorIdx}
                        className="size-4.5 rounded-full border border-foreground/20 hover:scale-125 transition-transform duration-200 cursor-pointer focus:outline-none"
                        style={{ backgroundColor: color }}
                        title={`Search similar to ${color}`}
                        onClick={e => {
                          e.stopPropagation()
                          setSearchColor(color)
                          setIsSearching(true)
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <TagSelector currentTags={allTags} imageIds={image.id}>
                <Button
                  variant="outline"
                  className="shrink-0"
                  size="icon-lg"
                  onClick={e => e.stopPropagation()}
                >
                  <TagIcon className="size-6" weight="bold" />
                </Button>
              </TagSelector>
            </div>
            <ScrollArea>
              <div className="w-full flex flex-wrap gap-1.5">
                {visibleTags.map(tag => (
                  <Badge
                    key={tag}
                    className="text-md bg-muted text-foreground/90 font-bold"
                  >
                    {tag}
                  </Badge>
                ))}
                {hasMoreTags && !showAllTags && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={e => {
                      e.stopPropagation()
                      setShowAllTags(true)
                    }}
                  >
                    +{hiddenTagsCount} more
                  </Button>
                )}
                {hasMoreTags && showAllTags && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={e => {
                      e.stopPropagation()
                      setShowAllTags(false)
                    }}
                  >
                    Show less
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>
        </article>
      </ImageContextMenu>
      <RenameImageDialog
        image={image}
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
      />
    </>
  )
}

function ImageContextMenu({
  children,
  image,
  onRename,
}: {
  children: React.ReactNode
  image: ImageData
  onRename: () => void
}) {
  const isSelectionMode = useSelectionStore(state => state.isSelectionMode)
  const selectedItems = useSelectionStore(state => state.selectedItems)

  const { data: allTags } = useTags()
  const { mutateAsync: addTagsMutation } = useAddTagsToImageMutation()
  const { setAiSearchImage } = useSearch()
  const deleteMutation = useDeleteImagesMutation()

  async function onPasteTags() {
    const text = await readFromClipboard()
    if (text) {
      const tagsSet = new Set<string>(allTags?.map(tag => tag.name))
      const tags: (TagData | Pick<TagData, 'name' | 'color'>)[] = text
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(trimmedTag => {
          if (tagsSet.has(trimmedTag))
            return (
              allTags!.find(t => t.name === trimmedTag) ?? { name: trimmedTag }
            )

          return { name: trimmedTag }
        })

      const targetImageIds = isSelectionMode
        ? Array.from(selectedItems)
        : [image.id]
      if (targetImageIds.length === 0 || tags.length === 0) return

      await addTagsMutation({
        imageIds: targetImageIds,
        tags,
      })
    }
  }

  const handleDelete = () => {
    const targetImageIds =
      isSelectionMode && selectedItems.has(image.id)
        ? Array.from(selectedItems)
        : [image.id]

    if (
      confirm(
        `Are you sure you want to move ${
          targetImageIds.length === 1
            ? 'this image'
            : `${targetImageIds.length} images`
        } to trash?`,
      )
    ) {
      deleteMutation.mutate(targetImageIds, {
        onSuccess: () => {
          if (isSelectionMode) {
            useSelectionStore.getState().clearSelection()
          }
        },
      })
    }
  }

  const isCurrentSelectionDeleted =
    isSelectionMode && selectedItems.has(image.id)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={e => e.preventDefault()}>
        <ContextMenuItem onClick={() => setAiSearchImage(image.filePath)}>
          <FileMagnifyingGlassIcon className="size-5" />
          Search Similar Images
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={async () => await copyToClipboard(image.filePath)}
        >
          <ClipboardIcon className="size-5" />
          Copy Image Path
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => window.api.system.revealInFileExplorer(image.filePath)}
        >
          <FolderOpenIcon className="size-5" />
          Show in System Explorer
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => window.api.system.openPathInDefaultApp(image.filePath)}
        >
          <RocketLaunchIcon className="size-5" />
          Open with Default App
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onRename} disabled={isSelectionMode}>
          <PencilIcon className="size-5" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive focus:bg-destructive/20 "
        >
          <TrashIcon className="size-5 text-destructive" />
          {isCurrentSelectionDeleted
            ? `Delete ${selectedItems.size} Selected Images`
            : 'Delete Image'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={async () => await copyToClipboard(image?.tags || '')}
          disabled={!image.tags}
        >
          <TagIcon className="size-5" />
          Copy Tags
        </ContextMenuItem>
        <ContextMenuItem onClick={async () => await onPasteTags()}>
          <PlusIcon className="size-5" />
          Paste Tags
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function RenameImageDialog({
  image,
  open,
  onOpenChange,
}: {
  image: ImageData
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const renameMutation = useRenameImageMutation()
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    const lastDot = image.filePath.lastIndexOf('.')
    const ext = lastDot !== -1 ? image.filePath.substring(lastDot) : ''
    const nameWithoutExt =
      image.fileName.endsWith(ext) && ext
        ? image.fileName.substring(0, image.fileName.length - ext.length)
        : image.fileName
    setName(nameWithoutExt)
    const timer = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [open, image])

  const handleRename = () => {
    const trimmed = name.trim()
    if (trimmed) {
      renameMutation.mutate(
        { imageId: image.id, newName: trimmed },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename {image.fileName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label
              htmlFor="image-name"
              className="text-xs font-semibold text-muted-foreground"
            >
              Name
            </label>
            <Input
              id="image-name"
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
              }}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={renameMutation.isPending}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
