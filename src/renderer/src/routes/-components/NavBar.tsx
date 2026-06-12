import { useFolder } from '@/components/providers/FolderProvider'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/lib/store/settings'
import { FileRoutesByTo } from '@/routeTree.gen'
import {
  GearIcon,
  HouseSimpleIcon,
  Icon,
  SidebarSimpleIcon,
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

export function NavBar() {
  const router = useRouter()
  const { pathname } = useLocation()
  const { toggleFolderTree, isFolderTreeOpen } = useSettingsStore()
  const { folderPath } = useFolder()

  if (!folderPath) return null

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
        </>
      )}
    </nav>
  )
}
