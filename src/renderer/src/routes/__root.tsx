import { FolderProvider } from '@/components/features/FolderProvider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sidebar } from '@/routes/-components/Sidebar'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import TopBar from './-components/TopBar'

const RootLayout = () => (
  <div className="h-screen flex">
    <Sidebar />
    <FolderProvider>
      <div className="flex-1 flex flex-col relative">
        <TopBar />
        <ScrollArea className="flex-1 overflow-auto h-100vh">
          <main className="ps-18 pt-16 min-h-full">
            <Outlet />
          </main>
        </ScrollArea>
      </div>
    </FolderProvider>
  </div>
)

export const Route = createRootRoute({ component: RootLayout })
