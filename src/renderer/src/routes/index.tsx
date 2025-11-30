import ImageCard from '@/components/cards/ImageCard'
import { useFolder } from '@/components/providers/FolderProvider'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { FolderOpenIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { openFolderDialog, folderImagesQuery } = useFolder()
  const { data: imagePaths, isLoading, isFetching } = folderImagesQuery

  if (isLoading || isFetching) {
    return (
      <div className="p-6 h-[90vh] flex items-center justify-center flex-col gap-4">
        <Spinner className="size-30" />
      </div>
    )
  }

  return (
    <div className="p-6 min-h-screen">
      {imagePaths === undefined && (
        <div className="text-center py-12 space-y-4">
          <p className="text-foreground text-3xl font-bold">No Folder Opened</p>
          <Button size="lg" className="text-xl" onClick={openFolderDialog}>
            <FolderOpenIcon className="size-6" weight="fill" />
            Open Folder
          </Button>
        </div>
      )}

      {imagePaths && imagePaths?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-foreground text-lg">Empty Folder</p>
        </div>
      )}

      {imagePaths && imagePaths.length > 0 && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 space-y-4 pb-20">
          {imagePaths?.map((image, index) => (
            <ImageCard key={index} image={image} />
          ))}
        </div>
      )}
    </div>
  )
}
