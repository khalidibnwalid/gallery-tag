import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useFolder } from '@/components/providers/FolderProvider'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/lib/store/settings'
import { FileRoutesByTo } from '@/routeTree.gen'
import {
  GearIcon,
  HouseSimpleIcon,
  Icon,
  SidebarSimpleIcon,
  ColumnsIcon,
  GridFourIcon,
  GridNineIcon,
  LayoutIcon,
} from '@phosphor-icons/react'
import { useLocation, useRouter } from '@tanstack/react-router'

interface NavItem {
  route: keyof FileRoutesByTo
  icon: Icon
}

const navigationItems: NavItem[] = [
  { icon: HouseSimpleIcon, route: '/' },
  { icon: GearIcon, route: '/settings' },
]

const DENSITY_STEPS: [number | 'auto', string][] = [
  ['auto', 'Dynamic'],
  [2, 'Comfortable'],
  [3, 'Default'],
  [4, 'Compact'],
  [5, 'Dense'],
]

export function NavBar() {
  const router = useRouter()
  const { pathname } = useLocation()
  const { toggleFolderTree, isFolderTreeOpen } = useSettingsStore()
  const { folderPath } = useFolder()
  const [gridDensity, setGridDensity] = useLocalStorage<number | 'auto'>(
    'grid-density',
    'auto',
  )

  if (!folderPath) return null

  const currentIndex = DENSITY_STEPS.findIndex(([cols]) => cols === gridDensity)
  const currentLabel = DENSITY_STEPS[currentIndex]?.[1] ?? DENSITY_STEPS[0][1]

  function cycleDensity() {
    const nextIndex = (currentIndex + 1) % DENSITY_STEPS.length
    setGridDensity(DENSITY_STEPS[nextIndex][0])
  }

  return (
    <nav className="z-50 fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-row gap-2 p-2 bg-background/80 backdrop-blur-md border rounded-2xl shadow-xl">
      {navigationItems.map(item => {
        const isActive = pathname === item.route

        return (
          <Button
            key={item.route}
            variant={isActive ? 'default' : 'outline'}
            size="icon"
            onClick={() => router.navigate({ to: item.route })}
            className="size-12 "
            title={item.route}
          >
            <item.icon
              className="size-6"
              weight={isActive ? 'fill' : 'regular'}
            />
          </Button>
        )
      })}
      {pathname === '/' && (
        <>
          <div className="w-px bg-border h-8 mx-1 self-center" />

          <Button
            variant={isFolderTreeOpen ? 'default' : 'outline'}
            size="icon"
            onClick={toggleFolderTree}
            className="size-12"
            title="Toggle Folder Tree"
          >
            <SidebarSimpleIcon
              className="size-6"
              weight={isFolderTreeOpen ? 'fill' : 'regular'}
            />
          </Button>

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
        </>
      )}
    </nav>
  )
}
