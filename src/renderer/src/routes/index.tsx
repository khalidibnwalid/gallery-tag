import { SidebarFilters } from '@/components/features/sidebar/SidebarFilters'
import { useFolder } from '@/components/providers/FolderProvider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createFileRoute } from '@tanstack/react-router'
import { ImageGallery } from './-components/ImageGallery'
import { NoFolderLanding } from './-components/NoFolderLanding'

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
