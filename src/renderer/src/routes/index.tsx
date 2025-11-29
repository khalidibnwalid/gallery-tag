import { useFolder } from '@/components/features/FolderProvider'
import { Button } from '@/components/ui/button'
import { FolderOpenIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { openFolderDialog, folderImagesQuery } = useFolder()
  const { data: imagePaths, isLoading, isFetching } = folderImagesQuery

  if (isLoading || isFetching) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <p className="text-foreground text-lg">Loading images...</p>
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
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 space-y-4 pb-20">
          <p className="text-foreground text-lg">Empty Folder</p>
        </div>
      )}

      {imagePaths && imagePaths.length > 0 && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 space-y-4 pb-20">
          {imagePaths?.map((path, index) => (
            <Card key={index} imagePath={path} />
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ title, imagePath }: { title?: string; imagePath: string }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="border rounded-lg overflow-hidden shadow-md relative group animate-fade-in">
      {!imageError ? (
        <img
          src={`file://${imagePath}`}
          alt={title}
          className="w-full object-cover inset-0"
          onError={() => {
            console.error('Error loading image:', imagePath)
            setImageError(true)
          }}
        />
      ) : (
        <div className="w-full h-48 flex items-center justify-center bg-muted">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Failed to load image
            </p>
            <p className="text-foreground text-xs mt-1">{title}</p>
          </div>
        </div>
      )}
      <div className="p-4 bg-linear-to-t from-background to-transparent absolute bottom-0 w-full opacity-0 group-hover:opacity-100 transition-opacity">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
    </div>
  )
}
