import { useFolder } from '@/components/providers/FolderProvider'
import { createFileRoute } from '@tanstack/react-router'
import { SidebarFilters } from './-components/SidebarFilters'
import { NoFolderLanding } from './-components/NoFolderLanding'
import { ImageGallery } from './-components/ImageGallery'
import { ScrollArea } from '@/components/ui/scroll-area'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { folderPath } = useFolder()

  return (
    <div className="flex h-full overflow-hidden">
      {folderPath && <SidebarFilters />}
      <ScrollArea className="flex-1 h-full">
        <div className="p-6 pt-20 pb-24">
          {!folderPath ? <NoFolderLanding /> : <ImageGallery />}
        </div>
      </ScrollArea>
    </div>
  )
}
