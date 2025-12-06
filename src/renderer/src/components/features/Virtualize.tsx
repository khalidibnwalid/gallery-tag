import { ReactNode, useEffect, useRef, useState } from 'react'
import { Spinner } from '../ui/spinner'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  height?: string | number
  /**
   * @default '100%'
   */
  width?: string | number
  /**
   * root margin for the intersection observer
   * @default '512px'
   */
  rootMargin?: string
  /**
   * intersection threshold
   * @default 0.05
   */
  threshold?: number
  className?: string
  style?: React.CSSProperties
  onVisible?: () => void
  onHidden?: () => void
}

export function Virtualize({
  children,
  fallback,
  height,
  width = '100%',
  rootMargin = '512px',
  threshold = 0.05,
  className,
  style,
  onVisible,
  onHidden,
}: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting
        setIsVisible(visible)

        if (visible) {
          onVisible?.()
        } else {
          onHidden?.()
        }
      },
      {
        rootMargin,
        threshold,
      },
    )

    if (ref.current) observer.observe(ref.current)
    return () => {
      if (ref.current) observer.unobserve(ref.current)
    }
  }, [rootMargin, threshold, onVisible, onHidden])

  const containerStyle: React.CSSProperties = {
    height,
    width,
    ...style,
  }

  const defaultFallback = (
    <div className="w-full h-full flex items-center justify-center bg-muted text-foreground animate-fade-in">
      <Spinner className="size-20 bg-pure/40 rounded-full" />
    </div>
  )

  return (
    <div ref={ref} style={containerStyle} className={className}>
      {isVisible ? children : (fallback ?? defaultFallback)}
    </div>
  )
}
