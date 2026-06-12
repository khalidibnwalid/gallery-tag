import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useLighthouse } from '../providers/LighthouseProvider'
import { FloatingToolbar } from './lighthouse/FloatingToolbar'
import { ImageViewport } from './lighthouse/ImageViewport'
import { SidebarDetails } from './lighthouse/SidebarDetails'

export default function Lighthouse() {
  const {
    isOpen,
    images,
    currentIndex,
    closeLighthouse: onClose,
    goToNext: onNext,
    goToPrevious: onPrevious,
  } = useLighthouse()

  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentImage = images[currentIndex]

  // Reset zoom and position when image changes
  useEffect(() => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }, [currentIndex])

  const toggleFullscreen = () => setIsFullscreen(prev => !prev)

  // Keyboard navigation
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

  // Zoom controls
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5))
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1))
  const resetZoom = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  if (!isOpen) return null

  // -------------------------------------------------------------
  // Fullscreen Render Mode (Focused Image view only)
  // -------------------------------------------------------------
  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-pure/95 backdrop-blur-sm animate-fade-in select-none">
        <div className="absolute inset-0 bg-pure/50" onClick={onClose} />

        <div className="relative h-full flex items-center justify-center">
          {/* Overlay controls */}
          <FloatingToolbar
            zoom={zoom}
            zoomIn={zoomIn}
            zoomOut={zoomOut}
            resetZoom={resetZoom}
            toggleFullscreen={toggleFullscreen}
          />

          {/* Interactive Image Viewport */}
          <ImageViewport
            currentImage={currentImage?.filePath}
            zoom={zoom}
            setZoom={setZoom}
            position={position}
            setPosition={setPosition}
            toggleFullscreen={toggleFullscreen}
          />

          {currentImage && (
            <div className="absolute bottom-4 left-4 right-4 z-10 bg-background/80 rounded-lg p-3 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <p className="text-sm font-medium truncate">
                {currentImage.fileName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Press ESC to close • Arrow keys to navigate • Mouse wheel to
                zoom • 0 to reset • F or double-click for fullscreen
              </p>
            </div>
          )}
        </div>
      </div>,
      document.body,
    )
  }

  // -------------------------------------------------------------
  // Detailed Layout Mode (Left full-height viewport, Right attached sidebar)
  // -------------------------------------------------------------
  return createPortal(
    <div className="fixed inset-0 z-50 bg-zinc-950 flex text-foreground animate-fade-in overflow-hidden select-none">
      {/* Left Block: Full-Height Image Viewport */}
      <div className="flex-1 h-screen relative flex items-center justify-center group">
        {/* Floating Capsule Toolbar (Overlay) */}
        <FloatingToolbar
          zoom={zoom}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resetZoom={resetZoom}
          toggleFullscreen={toggleFullscreen}
        />

        {/* Main Interactive Zoom/Drag container */}
        <ImageViewport
          currentImage={currentImage?.filePath}
          zoom={zoom}
          setZoom={setZoom}
          position={position}
          setPosition={setPosition}
          toggleFullscreen={toggleFullscreen}
        />
      </div>

      {/* Right Block: Attached Sidebar Details */}
      <SidebarDetails />
    </div>,
    document.body,
  )
}
