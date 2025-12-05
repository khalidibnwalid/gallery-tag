import ImageCard from '@/components/cards/ImageCard'
import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { SelectionProvider } from '@/components/providers/SelectionProvider'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { FolderOpenIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import SubBar from './-components/SubBar'
import { useImagesSearchQuery } from '@/lib/queries/images'

export const Route = createFileRoute('/')({
  component: IndexHOC,
})

function IndexHOC() {
  return (
    <SelectionProvider>
      <Index />
    </SelectionProvider>
  )
}

function Index() {
  const { openFolderDialog, folderImagesQuery } = useFolder()
  const { searchQuery, isSearching } = useSearch()

  const searchResults = useImagesSearchQuery(
    searchQuery,
    isSearching && searchQuery.length > 0,
  )

  const activeQuery =
    isSearching && searchQuery.length > 0 ? searchResults : folderImagesQuery
  const { data: images, isLoading, isFetching } = activeQuery

  if (isLoading || isFetching) {
    return (
      <div className="p-6 h-[90vh] flex items-center justify-center flex-col gap-4">
        <Spinner className="size-30" />
      </div>
    )
  }

  return (
    <div className="p-6 min-h-screen">
      {!isSearching && images === undefined && (
        <div className="text-center py-12 space-y-4">
          <p className="text-foreground text-3xl font-bold">No Folder Opened</p>
          <Button size="lg" className="text-xl" onClick={openFolderDialog}>
            <FolderOpenIcon className="size-6" weight="fill" />
            Open Folder
          </Button>
        </div>
      )}

      {images && images?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-foreground text-lg">
            {isSearching ? 'No search results found' : 'Empty Folder'}
          </p>
        </div>
      )}

      {images && images.length > 0 && (
        <>
          <SubBar />
          <div className="pb-20 gap-4 masonry">
            {images?.map((image, index) => (
              <ImageCard key={index} image={image} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
