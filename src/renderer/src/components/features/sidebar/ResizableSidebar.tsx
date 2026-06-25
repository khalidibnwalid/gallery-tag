import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { cn } from '@/lib/utils'
import { useRef, useState } from 'react'

interface ResizableSidebarProps {
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function ResizableSidebar({
  isOpen,
  onToggle,
  children,
}: ResizableSidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useLocalStorage('sidebar-width', 264)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartWidth = useRef(sidebarWidth)
  const dragStartX = useRef(0)
  const dragMoved = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    dragStartWidth.current = sidebarWidth
    dragStartX.current = e.clientX
    dragMoved.current = false

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current
      if (Math.abs(deltaX) > 3) {
        dragMoved.current = true
      }
      const newWidth = Math.max(
        180,
        Math.min(600, dragStartWidth.current + deltaX),
      )
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      if (!dragMoved.current) onToggle()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <aside
      className={cn(
        'h-full z-30 shrink-0 flex flex-col bg-background/5 backdrop-blur-sm relative border-e border-border/40 select-none pt-16',
        !isResizing && 'transition-all duration-300',
        !isOpen ? 'w-0 overflow-hidden opacity-0 border-e-0' : 'opacity-100',
      )}
      style={isOpen ? { width: `${sidebarWidth}px` } : {}}
    >
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
        {children}
      </div>

      <div
        className={cn(
          'absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 group/resize transition-colors duration-150',
          isResizing ? 'bg-primary' : 'bg-transparent hover:bg-primary/30',
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-muted-foreground/30 group-hover/resize:bg-primary-foreground/50 rounded transition-colors" />
      </div>
    </aside>
  )
}
