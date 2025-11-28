import { ScrollArea } from '@/components/ui/scroll-area'
import { Sidebar } from '@/routes/-components/Sidebar'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import TopBar from './-components/TopBar'

const RootLayout = () => (
  <div className="h-screen flex">
    <Sidebar />
    <div className="flex-1 flex flex-col relative">
      <TopBar />
      <ScrollArea className="flex-1 overflow-auto h-100vh">
        <main className="ps-20 pt-16 min-h-full">
          <Outlet />
        </main>
      </ScrollArea>
    </div>
  </div>
)

export const Route = createRootRoute({ component: RootLayout })
