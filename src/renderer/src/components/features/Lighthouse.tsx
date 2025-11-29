import { cn } from '@/lib/utils'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsInIcon,
  ArrowsOutIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../ui/button'

interface LighthouseProps {
  isOpen: boolean
  images: string[]
  currentIndex: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

export default function Lighthouse({
  isOpen,
  images,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
}: LighthouseProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentImage = images[currentIndex]

  // reset zoom and position when image changes
  useEffect(() => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }, [currentIndex])

  const toggleFullscreen = () => setIsFullscreen(prev => !prev)

  // double-click to toggle fullscreen
  const onImageDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleFullscreen()
  }

  // keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (images.length > 1) onPrevious()
          break
        case 'ArrowRight':
          if (images.length > 1) onNext()
          break
        case '+':
        case '=':
          e.preventDefault()
          setZoom(prev => Math.min(prev * 1.2, 5))
          break
        case '-':
          e.preventDefault()
          setZoom(prev => Math.max(prev / 1.2, 0.1))
          break
        case '0':
          e.preventDefault()
          setZoom(1)
          setPosition({ x: 0, y: 0 })
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, images.length])

  // mouse wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)))
  }

  // mouse drag
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

  // zoom controls
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5))
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1))
  const resetZoom = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 bg-pure/95 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0 bg-pure/50" onClick={onClose} />

      <div className="relative h-full flex items-center justify-center">
        <div
          className={cn(
            'absolute top-4 right-4 z-10 gap-2 flex',
            isFullscreen &&
              'opacity-0 hover:opacity-100 transition-opacity duration-300',
          )}
        >
          <Button
            variant="secondary"
            size="sm"
            className="bg-background/80 hover:bg-background"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <ArrowsInIcon className="size-5 rotate-180" />
            ) : (
              <ArrowsOutIcon className="size-5" />
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-background/80 hover:bg-background"
            onClick={onClose}
          >
            <XIcon className="size-5" />
          </Button>
        </div>

        {images.length > 1 && (
          <div
            className={cn(
              'absolute top-4 left-4 z-10 bg-background/80 rounded-lg px-3 py-2 text-sm font-medium',
              isFullscreen &&
                'opacity-0 hover:opacity-100 transition-opacity duration-300',
            )}
          >
            {currentIndex + 1} of {images.length}
          </div>
        )}

        <div
          className={cn(
            'absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2',
            isFullscreen &&
              'opacity-0 hover:opacity-100 transition-opacity duration-300',
          )}
        >
          <Button
            variant="secondary"
            size="sm"
            className="bg-background/80 hover:bg-background"
            onClick={zoomOut}
            disabled={zoom <= 0.1}
          >
            <MagnifyingGlassMinusIcon className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-background/80 hover:bg-background min-w-16"
            onClick={resetZoom}
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-background/80 hover:bg-background"
            onClick={zoomIn}
            disabled={zoom >= 5}
          >
            <MagnifyingGlassPlusIcon className="size-4" />
          </Button>
        </div>

        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="sm"
              className={cn(
                'absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-background/80 hover:bg-background',
                isFullscreen &&
                  'opacity-0 hover:opacity-100 transition-opacity duration-300',
              )}
              onClick={onPrevious}
              disabled={currentIndex === 0}
            >
              <ArrowLeftIcon className="size-5" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={cn(
                'absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-background/80 hover:bg-background',
                isFullscreen &&
                  'opacity-0 hover:opacity-100 transition-opacity duration-300',
              )}
              onClick={onNext}
              disabled={currentIndex === images.length - 1}
            >
              <ArrowRightIcon className="size-5" />
            </Button>
          </>
        )}

        <div
          className={cn(
            'relative overflow-hidden cursor-grab active:cursor-grabbing',
            isFullscreen
              ? 'w-screen h-screen flex items-center justify-center'
              : 'max-w-[90vw] max-h-[90vh]',
          )}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {currentImage && (
            <img
              src={`file://${currentImage}`}
              alt={`Image ${currentIndex + 1}`}
              className={cn(
                'transition-transform duration-200',
                isFullscreen
                  ? 'h-full object-contain'
                  : 'max-w-full max-h-full object-contain',
                isDragging && 'cursor-grabbing',
              )}
              style={{
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                transformOrigin: 'center center',
              }}
              draggable={false}
              onDoubleClick={onImageDoubleClick}
            />
          )}
        </div>

        {currentImage && (
          <div
            className={cn(
              'absolute bottom-4 left-4 right-4 z-10 bg-background/80 rounded-lg p-3',
              isFullscreen &&
                'opacity-0 hover:opacity-100 transition-opacity duration-300',
            )}
          >
            <p className="text-sm font-medium truncate">
              {currentImage.split('/').pop()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Press ESC to close • Arrow keys to navigate • Mouse wheel to zoom
              • 0 to reset • F or double-click for fullscreen
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
