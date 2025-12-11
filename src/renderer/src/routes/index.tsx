import ImageCard from '@/components/cards/ImageCard'
import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  useInfiniteImages,
  useInfiniteImagesSearch,
} from '@/lib/queries/images'
import { FolderOpenIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import SubBar from './-components/SubBar'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { openFolderDialog, folderPath } = useFolder()
  const { searchQuery, isSearching } = useSearch()
  const triggerFetchRef = useRef<HTMLDivElement>(null)

  const folderImagesQuery = useInfiniteImages(folderPath ?? undefined)
  const searchResults = useInfiniteImagesSearch(
    searchQuery,
    50,
    isSearching && searchQuery.length > 0,
  )

  const activeQuery =
    isSearching && searchQuery.length > 0 ? searchResults : folderImagesQuery

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    activeQuery

  const images = data?.pages.flat() || []

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    )

    if (triggerFetchRef.current) observer.observe(triggerFetchRef.current)

    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage, isFetchingNextPage])

  if (isLoading) {
    return (
      <div className="p-6 h-[90vh] flex items-center justify-center flex-col gap-4">
        <Spinner className="size-30" />
      </div>
    )
  }

  if (!folderPath)
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-foreground text-3xl font-bold">No Folder Opened</p>
        <Button size="lg" className="text-xl" onClick={openFolderDialog}>
          <FolderOpenIcon className="size-6" weight="fill" />
          Open Folder
        </Button>
      </div>
    )

  return (
    <div className="p-6 min-h-screen">
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
              <ImageCard key={image.id || index} image={image} index={index} />
            ))}
          </div>

          <div
            ref={triggerFetchRef}
            className="h-10 flex items-center justify-center"
          >
            {isFetchingNextPage && <Spinner className="size-10" />}
          </div>
        </>
      )}
    </div>
  )
}
