import {
  ArrowsOutIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Button } from '../../ui/button'
import { useLighthouse } from '@/components/providers/LighthouseProvider'

interface FloatingToolbarProps {
  zoom: number
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  toggleFullscreen: () => void
}

export function FloatingToolbar({
  zoom,
  zoomIn,
  zoomOut,
  resetZoom,
  toggleFullscreen,
}: FloatingToolbarProps) {
  const { closeLighthouse } = useLighthouse()

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white select-none">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-white hover:bg-white/10 cursor-pointer flex items-center justify-center"
        onClick={zoomOut}
        disabled={zoom <= 0.1}
      >
        <MagnifyingGlassMinusIcon className="size-4" />
      </Button>
      <button
        onClick={resetZoom}
        className="text-xs font-medium min-w-[40px] text-center hover:text-primary transition-colors cursor-pointer"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-white hover:bg-white/10 cursor-pointer flex items-center justify-center"
        onClick={zoomIn}
        disabled={zoom >= 5}
      >
        <MagnifyingGlassPlusIcon className="size-4" />
      </Button>
      <div className="w-px bg-white/20 h-4 mx-1" />
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-white hover:bg-white/10 cursor-pointer flex items-center justify-center"
        onClick={toggleFullscreen}
        title="Go Fullscreen"
      >
        <ArrowsOutIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-destructive hover:bg-destructive/20 cursor-pointer flex items-center justify-center"
        onClick={closeLighthouse}
        title="Close Viewer"
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  )
}
