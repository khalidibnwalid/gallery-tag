import Lighthouse from '@/components/features/Lighthouse'
import { FolderProvider } from '@/components/providers/FolderProvider'
import { SearchProvider } from '@/components/providers/SearchProvider'
import { NavBar } from '@/routes/-components/NavBar'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import TopBar from './-components/TopBar'

const RootLayout = () => {
  return (
    <div className="h-screen flex overflow-hidden">
      <FolderProvider>
        <NavBar />
        <SearchProvider>
          <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
            <TopBar />
            <main className="flex-1 min-h-0 relative">
              <Outlet />
            </main>
          </div>
          <Lighthouse />
        </SearchProvider>
      </FolderProvider>
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })
