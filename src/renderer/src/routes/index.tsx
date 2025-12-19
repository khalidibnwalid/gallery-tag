import ImageCard from '@/components/cards/ImageCard'
import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useInfiniteImages } from '@/lib/queries/images'
import { FolderOpenIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { FolderTree } from '@/components/features/FolderTree'
import SubBar from './-components/SubBar'
import { useSettingsStore } from '@/lib/store/settings'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { openFolderDialog, folderPath } = useFolder()
  const { searchQuery, isSearching } = useSearch()
  const triggerFetchRef = useRef<HTMLDivElement>(null)
  const { isFolderTreeOpen } = useSettingsStore()

  const [filterPath, setFilterPath] = useState<string | null>(null)

  const filter = {
    text: searchQuery,
    filterPath: filterPath ?? undefined,
  }

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteImages(folderPath ?? undefined, 50, filter)

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

  const handleSelectFolder = (path: string | null) => setFilterPath(path)

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 h-screen z-30 shrink-0">
        <FolderTree
          className={!isFolderTreeOpen ? 'w-0! opacity-0' : 'w-80 opacity-100'}
          onSelect={handleSelectFolder}
          selectedPath={filterPath}
        />
      </aside>
      <div className="flex-1 p-6 pt-20 pb-24 w-0">
        {!folderPath ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-foreground text-3xl font-bold">
              No Folder Opened
            </p>
            <Button size="lg" className="text-xl" onClick={openFolderDialog}>
              <FolderOpenIcon className="size-6" weight="fill" />
              Open Folder
            </Button>
          </div>
        ) : (
          <>
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
                    <ImageCard
                      key={image.id || index}
                      image={image}
                      index={index}
                    />
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
          </>
        )}
      </div>
    </div>
  )
}
