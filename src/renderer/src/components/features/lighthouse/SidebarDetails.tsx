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

        <div className="border-t border-border/60 pt-4 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
            Metadata
          </h3>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <span className="text-muted-foreground select-none">
              Dimensions
            </span>
            <span className="font-medium text-foreground text-right">
              {currentImageDetail?.width && currentImageDetail?.height
                ? `${currentImageDetail.width} × ${currentImageDetail.height}`
                : 'Unknown'}
            </span>

            <span className="text-muted-foreground select-none">Size</span>
            <span className="font-medium text-foreground text-right">
              {formatBytes(currentImageDetail?.size)}
            </span>

            <span className="text-muted-foreground select-none">Format</span>
            <span className="font-medium text-foreground text-right uppercase">
              {currentImageDetail?.extension || 'Unknown'}
            </span>

            <span className="text-muted-foreground select-none">Created</span>
            <span
              className="font-medium text-foreground text-right truncate"
              title={currentImageDetail?.createdAt}
            >
              {currentImageDetail?.createdAt
                ? new Date(currentImageDetail.createdAt).toLocaleDateString()
                : 'Unknown'}
            </span>
          </div>
        </div>

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
