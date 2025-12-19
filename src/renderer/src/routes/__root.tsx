import { FolderProvider } from '@/components/providers/FolderProvider'
import { SearchProvider } from '@/components/providers/SearchProvider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sidebar } from '@/routes/-components/Sidebar'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import TopBar from './-components/TopBar'

const RootLayout = () => (
  <div className="h-screen flex">
    <>
      <Sidebar />
      <FolderProvider>
        <SearchProvider>
          <div className="flex-1 flex flex-col relative">
            <TopBar />
            <ScrollArea className="flex-1 overflow-auto h-100vh">
              <main className="min-h-full pb-24">
                <Outlet />
              </main>
            </ScrollArea>
          </div>
        </SearchProvider>
      </FolderProvider>
    </>
  </div>
)

export const Route = createRootRoute({ component: RootLayout })
