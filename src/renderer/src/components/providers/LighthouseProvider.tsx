import Lighthouse from '@/components/features/Lighthouse'
import { ImageData } from '@/lib/types/image'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react'

interface Context {
  isOpen: boolean
  images: ImageData[]
  currentIndex: number
  openLighthouse: (images: ImageData[], startIndex?: number) => void
  closeLighthouse: () => void
  goToNext: () => void
  goToPrevious: () => void
  goToIndex: (index: number) => void
  insertAndGoToImage: (image: ImageData) => void
}

const LighthouseContext = createContext<Context | undefined>(undefined)

interface LighthouseProviderProps {
  children: ReactNode
}

export function LighthouseProvider({ children }: LighthouseProviderProps) {
  const lighthouse = useLighthouseState()

  return (
    <LighthouseContext.Provider value={lighthouse}>
      {children}
    </LighthouseContext.Provider>
  )
}

export function useLighthouse(): Context {
  const context = useContext(LighthouseContext)
  if (context === undefined) {
    throw new Error(
      'useLighthouseContext must be used within a LighthouseProvider',
    )
  }
  return context
}

interface LighthouseState {
  isOpen: boolean
  images: ImageData[]
  currentIndex: number
}

function useLighthouseState(): Context {
  const [state, setState] = useState<LighthouseState>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  })

  const openLighthouse = useCallback((images: ImageData[], startIndex = 0) => {
    if (images.length === 0) return

    const validIndex = Math.max(0, Math.min(startIndex, images.length - 1))
    setState({
      isOpen: true,
      images,
      currentIndex: validIndex,
    })
  }, [])

  const closeLighthouse = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }))
  }, [])

  const goToNext = useCallback(() => {
    setState(prev => {
      if (prev.images.length === 0) return prev
      return {
        ...prev,
        currentIndex: (prev.currentIndex + 1) % prev.images.length,
      }
    })
  }, [])

  const goToPrevious = useCallback(() => {
    setState(prev => {
      if (prev.images.length === 0) return prev
      return {
        ...prev,
        currentIndex:
          (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
      }
    })
  }, [])

  const goToIndex = useCallback((index: number) => {
    setState(prev => {
      if (prev.images.length === 0) return prev
      return {
        ...prev,
        currentIndex: Math.max(0, Math.min(index, prev.images.length - 1)),
      }
    })
  }, [])

  const insertAndGoToImage = useCallback((image: ImageData) => {
    setState(prev => {
      const existingIndex = prev.images.findIndex(img => img.filePath === image.filePath)
      if (existingIndex !== -1) {
        return {
          ...prev,
          currentIndex: existingIndex,
        }
      }
      const newImages = [...prev.images]
      const nextIndex = prev.currentIndex + 1
      newImages.splice(nextIndex, 0, image)
      return {
        ...prev,
        images: newImages,
        currentIndex: nextIndex,
      }
    })
  }, [])

  return {
    isOpen: state.isOpen,
    images: state.images,
    currentIndex: state.currentIndex,
    openLighthouse,
    closeLighthouse,
    goToNext,
    goToPrevious,
    goToIndex,
    insertAndGoToImage,
  }
}
