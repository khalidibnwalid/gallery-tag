import { Button } from '@/components/ui/button'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import {
  ColumnsIcon,
  GridFourIcon,
  GridNineIcon,
  LayoutIcon,
} from '@phosphor-icons/react'

const DENSITY_STEPS: [number | 'auto', string][] = [
  ['auto', 'Dynamic'],
  [2, 'Comfortable'],
  [3, 'Default'],
  [4, 'Compact'],
  [5, 'Dense'],
]

export function GridDensitySelector() {
  const [gridDensity, setGridDensity] = useLocalStorage<number | 'auto'>(
    'grid-density',
    'auto',
  )

  const currentIndex = DENSITY_STEPS.findIndex(([cols]) => cols === gridDensity)
  const currentLabel = DENSITY_STEPS[currentIndex]?.[1] ?? DENSITY_STEPS[0][1]

  function cycleDensity() {
    const nextIndex = (currentIndex + 1) % DENSITY_STEPS.length
    setGridDensity(DENSITY_STEPS[nextIndex][0])
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycleDensity}
      className="size-12 relative group"
      title={`Grid density: ${currentLabel}`}
    >
      {gridDensity === 'auto' && (
        <LayoutIcon className="size-6" weight="regular" />
      )}
      {gridDensity === 2 && (
        <ColumnsIcon className="size-6" weight="regular" />
      )}
      {gridDensity === 3 && (
        <GridFourIcon className="size-6" weight="regular" />
      )}
      {typeof gridDensity === 'number' && gridDensity >= 4 && (
        <GridNineIcon className="size-6" weight="regular" />
      )}
      <span className="absolute -top-1 -right-1 text-[9px] font-bold leading-none bg-primary text-primary-foreground rounded-full size-4 flex items-center justify-center">
        {gridDensity === 'auto' ? 'A' : gridDensity}
      </span>
    </Button>
  )
}
