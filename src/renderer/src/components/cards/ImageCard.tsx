import { ImageData } from '@/lib/types/image'
import { CheckIcon, TagIcon } from '@phosphor-icons/react'
import clsx from 'clsx'
import { MouseEvent, useEffect, useRef, useState } from 'react'
import { useFolder } from '../providers/FolderProvider'
import { useLighthouse } from '../providers/LighthouseProvider'
import { useSelection } from '../providers/SelectionProvider'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Spinner } from '../ui/spinner'
import { TagSelector } from '../features/TagsSelector'

const TAG_DISPLAY_LIMIT = 5

export default function ImageCard({ image }: { image: ImageData }) {
  const {
    folderImagesQuery: { data: allImages },
  } = useFolder()
  const { openLighthouse } = useLighthouse()
  const { isSelectionMode, isSelected, toggleSelection, toggleSelectionMode } =
    useSelection<typeof image.id>()

  const [imageError, setImageError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [showAllTags, setShowAllTags] = useState(false)

  const allTags = image.tags ? image.tags.split(',').map(tag => tag.trim()) : []
  const hasMoreTags = allTags.length > TAG_DISPLAY_LIMIT
  const hiddenTagsCount = allTags.length - TAG_DISPLAY_LIMIT
  const visibleTags = showAllTags
    ? allTags
    : allTags.slice(0, TAG_DISPLAY_LIMIT)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      {
        rootMargin: '512px',
        threshold: 0.05,
      },
    )

    if (cardRef.current) observer.observe(cardRef.current)
    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current)
    }
  }, [])

  // maintain aspect ratio on unload
  const onImageLoad = () => {
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
      toggleSelection(image.id)
      return
    } else if (e.ctrlKey || e.metaKey) {
      toggleSelectionMode(true)
      toggleSelection(image.id)
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

  const style = {
    height: `${imageDimensions?.height || 500}px`,
    width: '100%',
  }

  return (
    <article
      ref={cardRef}
      style={style}
      className={clsx(
        'border-2 rounded-lg overflow-hidden shadow-md relative group animate-fade-in hover:outline-4 hover:outline-primary cursor-pointer duration-100',
        isSelectionMode &&
          'hover:after:bg-primary/20 after:inset-0 after:absolute after:z-0 ',
        isSelectionMode &&
          isSelected(image.id) &&
          'outline-6 outline-primary/80 hover:outline-8 after:bg-primary/10',
      )}
      onClick={openImage}
    >
      {isSelectionMode && (
        <div className="absolute top-2 right-2 z-10 duration-100">
          <div
            className={clsx(
              'size-6 rounded-md border-2 flex items-center justify-center',
              isSelected(image.id) ? 'bg-primary-blue' : 'bg-foreground/80',
            )}
          >
            {isSelected(image.id) && (
              <CheckIcon weight="bold" className="size-4" />
            )}
          </div>
        </div>
      )}
      {isVisible && !imageError ? (
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
      ) : isVisible && imageError ? (
        <div className="w-full min-h-48 h-full flex items-center justify-center bg-muted animate-fade-in">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Failed to load image
            </p>
            <p className="text-foreground text-xs mt-1">{image.fileName}</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted text-foreground animate-fade-in">
          <Spinner className="size-20 bg-pure/40 rounded-full" />
        </div>
      )}

      <div className="grid gap-1 p-3 bg-background/60 max-h-1/2 backdrop-blur-3xl absolute bottom-0 w-full opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-start justify-between gap-1">
          <h2 className="text-xl font-semibold">{image.fileName}</h2>
          <TagSelector currentTags={allTags} imageIds={image.id}>
            <Button
              variant="outline"
              className=""
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
  )
}
