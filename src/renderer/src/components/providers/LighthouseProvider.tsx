import { ImageData } from '@/lib/types/image'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'

export interface LighthouseOptions {
  fetchNextPage?: () => void
  hasNextPage?: boolean
}

interface Context {
  isOpen: boolean
  images: ImageData[]
  currentIndex: number
  openLighthouse: (
    images: ImageData[],
    startIndex?: number,
    options?: LighthouseOptions,
  ) => void
  closeLighthouse: () => void
  goToNext: () => void
  goToPrevious: () => void
  goToIndex: (index: number) => void
  insertAndGoToImage: (image: ImageData) => void
  syncImages: (newImages: ImageData[]) => void
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

  const optionsRef = useRef<LighthouseOptions>({})
  const isOpenRef = useRef(false)

  isOpenRef.current = state.isOpen

  const openLighthouse = useCallback(
    (images: ImageData[], startIndex = 0, options?: LighthouseOptions) => {
      if (images.length === 0) return

      optionsRef.current = options ?? {}
      const validIndex = Math.max(0, Math.min(startIndex, images.length - 1))
      setState({
        isOpen: true,
        images,
        currentIndex: validIndex,
      })
    },
    [],
  )

  const closeLighthouse = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }))
  }, [])

  const goToNext = useCallback(() => {
    setState(prev => {
      if (prev.images.length === 0) return prev
      const nextIndex = prev.currentIndex + 1
      if (nextIndex >= prev.images.length) {
        if (optionsRef.current.hasNextPage) {
          optionsRef.current.fetchNextPage?.()
        }
        return prev
      }
      return { ...prev, currentIndex: nextIndex }
    })
  }, [])

  const goToPrevious = useCallback(() => {
    setState(prev => {
      if (prev.images.length === 0) return prev
      const prevIndex = prev.currentIndex - 1
      if (prevIndex < 0) return prev
      return { ...prev, currentIndex: prevIndex }
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
      const existingIndex = prev.images.findIndex(
        img => img.filePath === image.filePath,
      )
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

  const syncImages = useCallback((newImages: ImageData[]) => {
    if (!isOpenRef.current) return
    if (newImages.length === 0) return

    setState(prev => {
      const currentImage = prev.images[prev.currentIndex]
      if (!currentImage) return prev

      const newIndex = newImages.findIndex(
        img => img.filePath === currentImage.filePath,
      )

      // The current image is a recommended image that isn't in the new images list.
      // To keep the user's current context, we preserve the current images list,
      // but we can update any images in it that exist in newImages (to get updated tags/metadata).
      if (newIndex === -1) {
        const updatedImages = prev.images.map(prevImg => {
          const match = newImages.find(img => img.filePath === prevImg.filePath)
          return match ? match : prevImg
        })
        return {
          ...prev,
          images: updatedImages,
        }
      }

      return {
        ...prev,
        images: newImages,
        currentIndex: newIndex,
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
    syncImages,
  }
}
