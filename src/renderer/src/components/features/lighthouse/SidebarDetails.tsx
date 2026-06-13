import { RenameImageDialog } from '@/components/cards/ImageCard'
import { TagSelector } from '@/components/features/TagsSelector'
import { useFolder } from '@/components/providers/FolderProvider'
import { useLighthouse } from '@/components/providers/LighthouseProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { useSimilarImagesQuery } from '@/lib/queries/images'
import { ImageData } from '@/lib/types/image'
import {
  ClipboardIcon,
  FolderOpenIcon,
  ImagesIcon,
  PencilIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../ui/button'
import { formatBytes } from './utils'

export function SidebarDetails() {
  const { folderPath, folderImagesQuery, paginatedImagesQuery } = useFolder()
  const { setSearchColor, setIsSearching } = useSearch()
  const {
    images,
    currentIndex,
    goToIndex,
    closeLighthouse,
    insertAndGoToImage,
  } = useLighthouse()

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)

  const currentImage = images[currentIndex]

  // Lookup the latest version of the images from the query cache to reflect tag/metadata updates in real-time
  const folderImages = folderImagesQuery?.data || []
  const paginatedImages =
    paginatedImagesQuery?.data?.pages.flatMap(page => page.data) || []

  const currentImageDetail = currentImage
    ? folderImages.find(img => img.filePath === currentImage.filePath) ||
      paginatedImages.find(img => img.filePath === currentImage.filePath) ||
      currentImage
    : null

  const prevImage = currentIndex > 0 ? images[currentIndex - 1] : null
  const nextImage =
    currentIndex < images.length - 1 ? images[currentIndex + 1] : null

  const prevImageDetail = prevImage
    ? folderImages.find(img => img.filePath === prevImage.filePath) ||
      paginatedImages.find(img => img.filePath === prevImage.filePath) ||
      prevImage
    : null

  const nextImageDetail = nextImage
    ? folderImages.find(img => img.filePath === nextImage.filePath) ||
      paginatedImages.find(img => img.filePath === nextImage.filePath) ||
      nextImage
    : null

  // 1. Fetch similar images using AI semantic search (CLIP model) for current image
  const { data: similarImages = [] } = useSimilarImagesQuery(
    currentImageDetail?.filePath,
    folderPath,
  )

  // 2. Pre-fetch similarity search for previous image to enable zero-lag browsing
  useSimilarImagesQuery(prevImageDetail?.filePath, folderPath)

  // 3. Pre-fetch similarity search for next image to enable zero-lag browsing
  useSimilarImagesQuery(nextImageDetail?.filePath, folderPath)

  const handleReveal = () => {
    if (currentImageDetail?.filePath) {
      window.api.system.revealInFileExplorer(currentImageDetail.filePath)
    }
  }

  const handleCopyPath = () => {
    if (currentImageDetail?.filePath) {
      navigator.clipboard.writeText(currentImageDetail.filePath)
      toast.success('File path copied to clipboard')
    }
  }

  const handleSelectSimilarImage = (img: ImageData) => {
    insertAndGoToImage(img)
  }

  const tagChips = currentImageDetail?.tags
    ? currentImageDetail.tags.split(',').map(t => t.trim())
    : []

  return (
    <div className="w-80 md:w-96 h-screen border-l border-border bg-card flex flex-col shrink-0 overflow-y-auto select-text">
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                File Name
              </h3>
              <button
                onClick={() => setIsRenameDialogOpen(true)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors cursor-pointer select-none"
                title="Rename file"
              >
                <PencilIcon className="size-4" />
              </button>
            </div>
            <h1 className="text-base font-bold text-foreground mt-1 break-all select-all">
              {currentImageDetail?.fileName ||
                currentImageDetail?.filePath.split('/').pop()}
            </h1>
          </div>
        </div>
        <div className="border-t border-border/60 pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
              Tags
            </h3>
            {currentImageDetail && (
              <TagSelector
                currentTags={tagChips}
                imageIds={currentImageDetail.id}
              >
                <button
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors cursor-pointer select-none"
                  title="Edit tags"
                >
                  <PlusIcon className="size-4" />
                </button>
              </TagSelector>
            )}
          </div>
          {tagChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tagChips.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-md font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic select-none">
              No tags associated with this image
            </p>
          )}
        </div>

        <div className="border-t border-border/60 pt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 select-none">
            Colors
          </h3>
          {currentImageDetail?.dominantColors &&
          currentImageDetail.dominantColors.length > 0 ? (
            <div className="flex items-center gap-3">
              {currentImageDetail.dominantColors.map(color => (
                <div
                  key={color}
                  className="size-8 rounded-full border border-foreground/10 shadow-xs relative group cursor-pointer transition-transform hover:scale-115"
                  style={{ backgroundColor: color }}
                  title={`Color: ${color}. Click to filter.`}
                  onClick={() => {
                    setSearchColor(color)
                    setIsSearching(true)
                    closeLighthouse()
                  }}
                >
                  <span className="opacity-0 group-hover:opacity-100 absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-30">
                    {color}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic select-none">
              No colors extracted yet
            </p>
          )}
        </div>

        <ImageMetadataDetails currentImageDetail={currentImageDetail} />

        {(prevImageDetail || nextImageDetail) && (
          <div className="border-t border-border/60 pt-4 flex flex-col gap-3 select-none">
            <div className="grid grid-cols-2 gap-3">
              {prevImageDetail ? (
                <div
                  onClick={() => goToIndex(currentIndex - 1)}
                  className="group flex flex-col gap-1.5 p-2 bg-muted/20 border border-border/60 hover:border-primary/45 rounded-lg cursor-pointer transition-all duration-200"
                >
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                    ← Previous
                  </span>
                  <div className="aspect-video bg-muted/40 rounded-md overflow-hidden relative border border-border/40">
                    <img
                      src={`file://${prevImageDetail.thumbnailPath}`}
                      alt={prevImageDetail.fileName}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-3 border border-dashed border-border/40 rounded-lg bg-muted/5 opacity-50 select-none text-[10px] text-muted-foreground italic h-full">
                  First image
                </div>
              )}

              {nextImageDetail ? (
                <div
                  onClick={() => goToIndex(currentIndex + 1)}
                  className="group flex flex-col gap-1.5 p-2 bg-muted/20 border border-border/60 hover:border-primary/45 rounded-lg cursor-pointer transition-all duration-200"
                >
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide text-right">
                    Next →
                  </span>
                  <div className="aspect-video bg-muted/40 rounded-md overflow-hidden relative border border-border/40">
                    <img
                      src={`file://${nextImageDetail.thumbnailPath}`}
                      alt={nextImageDetail.fileName}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-3 border border-dashed border-border/40 rounded-lg bg-muted/5 opacity-50 select-none text-[10px] text-muted-foreground italic h-full">
                  Last image
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-border/60 pt-4 flex flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReveal}
            className="flex-1 flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <FolderOpenIcon className="size-3.5" />
            Reveal in Explorer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPath}
            className="flex-1 flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <ClipboardIcon className="size-3.5" />
            Copy File Path
          </Button>
        </div>

        <div className="border-t border-border/60 pt-4 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 select-none">
            <ImagesIcon className="size-3.5" weight="fill" />
            Similar Images
          </h3>
          {similarImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {similarImages.map(img => (
                <div
                  key={img.id}
                  onClick={() => handleSelectSimilarImage(img)}
                  className="group relative aspect-square bg-muted/40 rounded-lg overflow-hidden cursor-pointer border border-border/60 hover:border-primary/50 transition-all duration-300 animate-fade-in"
                  title={`${img.fileName} (${img.ai_distance !== undefined ? Math.round((1 - img.ai_distance) * 100) : 0}% match)`}
                >
                  <img
                    src={`file://${img.thumbnailPath}`}
                    alt={img.fileName}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic select-none">
              No similar images found
            </p>
          )}
        </div>
      </div>
      {currentImageDetail && (
        <RenameImageDialog
          image={currentImageDetail}
          open={isRenameDialogOpen}
          onOpenChange={setIsRenameDialogOpen}
        />
      )}
    </div>
  )
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-border/60 pt-4 flex flex-col gap-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left py-0.5 group select-none hover:opacity-80 transition-opacity"
      >
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-muted-foreground/60 group-hover:text-foreground transition-colors duration-150">
          <svg
            className={`w-3 h-3 transform transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>
      {isOpen && children}
    </div>
  )
}

interface MetadataFieldProps {
  label: string
  value: string | number | null | undefined
  allowTruncate?: boolean
  tooltip?: string
  layout?: 'row' | 'col'
}

function MetadataField({
  label,
  value,
  allowTruncate = false,
  tooltip,
  layout = 'row',
}: MetadataFieldProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  if (value === null || value === undefined || value === '') return null

  const valStr = String(value)
  const isLong = allowTruncate && valStr.length > 80
  const displayValue =
    isLong && !isExpanded ? `${valStr.slice(0, 80)}...` : valStr

  if (layout === 'col' || isLong) {
    return (
      <div className="flex flex-col gap-1 text-xs border-b border-border/20 last:border-b-0 py-1.5 w-full col-span-2">
        <div className="flex justify-between items-start gap-3">
          <span
            className="text-muted-foreground select-none font-medium shrink-0 max-w-[120px] truncate"
            title={tooltip || label}
          >
            {label}
          </span>
          <span className="font-medium text-foreground text-right break-all overflow-hidden max-w-full">
            {displayValue}
          </span>
        </div>
        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] text-primary hover:text-primary/80 font-medium self-end transition-colors mt-0.5 select-none"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <span
        className="text-muted-foreground select-none font-medium truncate"
        title={tooltip || label}
      >
        {label}
      </span>
      <span
        className="font-medium text-foreground text-right truncate"
        title={tooltip || valStr}
      >
        {valStr}
      </span>
    </>
  )
}

function ImageMetadataDetails({
  currentImageDetail,
}: {
  currentImageDetail: ImageData | null
}) {
  if (!currentImageDetail) return null

  const hasExifData = !!(
    currentImageDetail.exif &&
    (currentImageDetail.exif.cameraModel ||
      currentImageDetail.exif.lensModel ||
      currentImageDetail.exif.aperture ||
      currentImageDetail.exif.dateTaken ||
      currentImageDetail.exif.gpsLatitude ||
      currentImageDetail.exif.software)
  )

  const hasRawExif = !!(
    currentImageDetail.exif?.raw &&
    Object.keys(currentImageDetail.exif.raw).length > 0
  )

  return (
    <>
      <CollapsibleSection title="Metadata" defaultOpen>
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <MetadataField
            label="Dimensions"
            value={
              currentImageDetail.width && currentImageDetail.height
                ? `${currentImageDetail.width} × ${currentImageDetail.height}`
                : null
            }
          />
          <MetadataField
            label="Size"
            value={formatBytes(currentImageDetail.size)}
          />
          <MetadataField
            label="Format"
            value={currentImageDetail.extension?.toUpperCase()}
          />
          <MetadataField
            label="Created"
            value={
              currentImageDetail.createdAt
                ? new Date(currentImageDetail.createdAt).toLocaleDateString()
                : null
            }
            tooltip={currentImageDetail.createdAt}
          />
        </div>
      </CollapsibleSection>

      {hasExifData && currentImageDetail.exif && (
        <CollapsibleSection title="Camera Info (EXIF)" defaultOpen>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <MetadataField
              label="Camera"
              value={currentImageDetail.exif.cameraModel}
              tooltip={`${currentImageDetail.exif.cameraMake || ''} ${currentImageDetail.exif.cameraModel}`}
            />
            <MetadataField
              label="Lens"
              value={currentImageDetail.exif.lensModel}
            />
            <MetadataField
              label="Exposure"
              value={
                [
                  currentImageDetail.exif.focalLength
                    ? `${currentImageDetail.exif.focalLength}`
                    : '',
                  currentImageDetail.exif.aperture
                    ? `f/${currentImageDetail.exif.aperture}`
                    : '',
                  currentImageDetail.exif.exposureTime
                    ? `${currentImageDetail.exif.exposureTime}s`
                    : '',
                  currentImageDetail.exif.iso
                    ? `ISO ${currentImageDetail.exif.iso}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' • ') || null
              }
            />
            <MetadataField
              label="Date Taken"
              value={
                currentImageDetail.exif.dateTaken
                  ? new Date(currentImageDetail.exif.dateTaken).toLocaleString()
                  : null
              }
            />
            <MetadataField
              label="GPS"
              value={
                currentImageDetail.exif.gpsLatitude !== undefined &&
                currentImageDetail.exif.gpsLongitude !== undefined
                  ? `${currentImageDetail.exif.gpsLatitude.toFixed(4)}°, ${currentImageDetail.exif.gpsLongitude.toFixed(4)}°`
                  : null
              }
              tooltip={
                currentImageDetail.exif.gpsLatitude !== undefined &&
                currentImageDetail.exif.gpsLongitude !== undefined
                  ? `${currentImageDetail.exif.gpsLatitude.toFixed(6)}°, ${currentImageDetail.exif.gpsLongitude.toFixed(6)}°`
                  : undefined
              }
            />
            <MetadataField
              label="Software"
              value={currentImageDetail.exif.software}
            />
          </div>
        </CollapsibleSection>
      )}

      {hasRawExif && currentImageDetail.exif?.raw && (
        <CollapsibleSection
          title={`All Metadata (${Object.keys(currentImageDetail.exif.raw).length})`}
        >
          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-1">
            {Object.entries(currentImageDetail.exif.raw)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => (
                <MetadataField
                  key={key}
                  label={key}
                  value={String(value)}
                  allowTruncate
                  layout="col"
                />
              ))}
          </div>
        </CollapsibleSection>
      )}
    </>
  )
}
