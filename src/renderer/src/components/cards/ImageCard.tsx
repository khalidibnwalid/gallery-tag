import { useEffect, useRef, useState } from 'react'
import { useFolder } from '../providers/FolderProvider'
import { useLighthouse } from '../providers/LighthouseProvider'
import { Spinner } from '../ui/spinner'

export default function ImageCard({
  title,
  imagePath,
}: {
  title?: string
  imagePath: string
}) {
  const {
    folderImagesQuery: { data: allImages },
  } = useFolder()
  const { openLighthouse } = useLighthouse()

  const [imageError, setImageError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      {
        rootMargin: '200%',
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

  const openImage = () => {
    if (allImages && allImages.length > 0) {
      const startIndex = allImages.indexOf(imagePath)
      openLighthouse(allImages, startIndex >= 0 ? startIndex : 0)
    } else {
      openLighthouse([imagePath], 0)
    }
  }

  const style = {
    height: `${imageDimensions?.height || 500}px`,
    width: '100%',
  }

  return (
    <div
      ref={cardRef}
      style={style}
      className="border-2 rounded-lg overflow-hidden shadow-md relative group animate-fade-in hover:outline-4 hover:outline-primary cursor-pointer"
      onClick={openImage}
    >
      {isVisible && !imageError ? (
        <img
          ref={imgRef}
          src={`file://${imagePath}`}
          alt={title}
          className="w-full object-cover inset-0 animate-fade-in hover:opacity-95 transition-opacity"
          onLoad={onImageLoad}
          onError={() => {
            console.error('Error loading image:', imagePath)
            setImageError(true)
          }}
        />
      ) : isVisible && imageError ? (
        <div className="w-full h-48 flex items-center justify-center bg-muted animate-fade-in">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Failed to load image
            </p>
            <p className="text-foreground text-xs mt-1">{title}</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted text-foreground animate-fade-in">
          <Spinner className="size-20 bg-pure/40 rounded-full" />
        </div>
      )}
      <div className="p-4 bg-linear-to-t from-background to-transparent absolute bottom-0 w-full opacity-0 group-hover:opacity-100 transition-opacity">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
    </div>
  )
}
