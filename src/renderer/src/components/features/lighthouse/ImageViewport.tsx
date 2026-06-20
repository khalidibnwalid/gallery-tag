import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { Button } from '../../ui/button'
import { useLighthouse } from '@/components/providers/LighthouseProvider'

interface ImageViewportProps {
  currentImage?: string
  zoom: number
  setZoom: React.Dispatch<React.SetStateAction<number>>
  position: { x: number; y: number }
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  toggleFullscreen: () => void
}

export function ImageViewport({
  currentImage,
  zoom,
  setZoom,
  position,
  setPosition,
  toggleFullscreen,
}: ImageViewportProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const { images, currentIndex, goToPrevious, goToNext } = useLighthouse()

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)))
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const onMouseUp = () => setIsDragging(false)

  const onDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleFullscreen()
  }

  const fileName = currentImage?.split('/').pop()
  const imagesLength = images.length

  return (
    <div
      className="size-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing relative"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDoubleClick={onDoubleClick}
    >
      {currentImage && (
        <img
          src={`file://${currentImage}`}
          alt={fileName || 'Gallery Image'}
          className={cn(
            'transition-transform duration-200 select-none pointer-events-none w-full h-full object-contain',
            isDragging && 'cursor-grabbing',
          )}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transformOrigin: 'center center',
          }}
        />
      )}

      {imagesLength > 1 && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-md text-white rounded-full px-3.5 py-1.5 text-xs font-medium border border-white/10 select-none">
          {currentIndex + 1} of {imagesLength}
        </div>
      )}

      {imagesLength > 1 && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full size-10 shadow-md bg-black/60 border border-white/10 hover:bg-black/80 text-white cursor-pointer flex items-center justify-center"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            <ArrowLeftIcon className="size-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full size-10 shadow-md bg-black/60 border border-white/10 hover:bg-black/80 text-white cursor-pointer flex items-center justify-center"
            onClick={goToNext}
            disabled={currentIndex === imagesLength - 1}
          >
            <ArrowRightIcon className="size-5" />
          </Button>
        </>
      )}
    </div>
  )
}
