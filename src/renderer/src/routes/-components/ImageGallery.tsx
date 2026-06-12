import ImageCard from '@/components/cards/ImageCard'
import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { Spinner } from '@/components/ui/spinner'
import { useInfiniteImages } from '@/lib/queries/images'
import { useEffect, useRef } from 'react'
import SubBar from './SubBar'

export function ImageGallery() {
  const { folderPath } = useFolder()
  const {
    searchQuery,
    filterPath,
    filterTags,
    excludedTags,
    isSearching,
    searchColor,
    aiSearchText,
    aiSearchImage,
  } = useSearch()
  const triggerFetchRef = useRef<HTMLDivElement>(null)

  const filter = {
    text: searchQuery,
    filterPath: filterPath ?? undefined,
    tags: filterTags,
    excludedTags,
    color: searchColor ?? undefined,
    aiSearchText: aiSearchText || undefined,
    aiSearchImage: aiSearchImage || undefined,
  }

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteImages(folderPath ?? undefined, 50, filter)

  const images = data?.pages.flatMap(page => page.data) || []

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

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-foreground text-lg">
          {isSearching || aiSearchText || aiSearchImage
            ? 'No search results found'
            : 'Empty Folder'}
        </p>
      </div>
    )
  }

  return (
    <>
      <SubBar />
      <div className="pb-20 gap-4 masonry">
        {images.map((image, index) => (
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
  )
}
