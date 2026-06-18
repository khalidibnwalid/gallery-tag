import ImageCard from '@/components/cards/ImageCard'
import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { Spinner } from '@/components/ui/spinner'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useInfiniteImages } from '@/lib/queries/images'
import React, { useEffect, useRef } from 'react'
import SubBar from './SubBar'

export function ImageGallery() {
  const { folderPath } = useFolder()
  const { isSearching, aiSearchText, aiSearchImage, filter } = useSearch()
  const [gridDensity] = useLocalStorage<number | 'auto'>('grid-density', 'auto')
  const triggerFetchRef = useRef<HTMLDivElement>(null)
  const masonryRef = useRef<HTMLDivElement>(null)

  const filterKey = JSON.stringify([
    filter?.tags,
    filter?.tagMode,
    filter?.excludedTags,
    filter?.text,
    filter?.color,
    filter?.aiSearchText,
    filter?.aiSearchImage,
    filter?.filterPath,
    filter?.sortBy,
    filter?.sortOrder,
  ])

  useEffect(() => {
    const scrollContainer = masonryRef.current?.closest(
      '[data-slot="scroll-area-viewport"]',
    )
    if (scrollContainer) {
      scrollContainer.scrollTop = 0
    } else {
      masonryRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
        inline: 'start',
      })
    }
  }, [filterKey])

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
      <SubBar images={images} total={data?.pages[0]?.total ?? 0} />
      <div
        ref={masonryRef}
        className="pb-20 masonry"
        style={
          {
            '--masonry-columns-rule':
              gridDensity === 'auto'
                ? 'repeat(auto-fill, minmax(400px, 1fr))'
                : `repeat(${gridDensity}, 1fr)`,
          } as React.CSSProperties
        }
      >
        {images.map((image, index) => (
          <ImageCard
            key={image.id || index}
            image={image}
            index={index}
            allSearchImages={images}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
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
  )
}
