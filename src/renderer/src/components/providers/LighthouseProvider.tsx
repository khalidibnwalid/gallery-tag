import Lighthouse from '@/components/features/Lighthouse'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react'

interface Context {
  isOpen: boolean
  images: string[]
  currentIndex: number
  openLighthouse: (images: string[], startIndex?: number) => void
  closeLighthouse: () => void
  goToNext: () => void
  goToPrevious: () => void
  goToIndex: (index: number) => void
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
      <Lighthouse
        isOpen={lighthouse.isOpen}
        images={lighthouse.images}
        currentIndex={lighthouse.currentIndex}
        onClose={lighthouse.closeLighthouse}
        onNext={lighthouse.goToNext}
        onPrevious={lighthouse.goToPrevious}
      />
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
  images: string[]
  currentIndex: number
}

function useLighthouseState(): Context {
  const [state, setState] = useState<LighthouseState>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  })

  const openLighthouse = useCallback((images: string[], startIndex = 0) => {
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
    setState(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length,
    }))
  }, [])

  const goToPrevious = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex:
        (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
    }))
  }, [])

  const goToIndex = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentIndex: Math.max(0, Math.min(index, prev.images.length - 1)),
    }))
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
  }
}
