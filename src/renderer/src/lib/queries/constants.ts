import { SearchFilter } from '@main/types/api.shared'

const QUERIES = {
  IMAGES: (folderPath?: string) =>
    folderPath ? (['images', folderPath] as const) : (['images'] as const),
  IMAGES_PAGINATED: (folderPath?: string, filter?: SearchFilter) => {
    const key: any[] = ['images', 'paginated']
    if (folderPath) key.push(folderPath)
    if (filter !== undefined) key.push(filter)
    return key as readonly any[]
  },
  IMAGES_SEARCH: (query?: string) =>
    query
      ? (['images', 'search', query] as const)
      : (['images', 'search'] as const),
  IMAGE_SIMILAR: (filePath: string, folderPath: string) =>
    folderPath
      ? (['images', 'similar', filePath, folderPath] as const)
      : (['images', 'similar', filePath] as const),
  TAGS: () => ['tags'] as const,
  TAGS_SEARCH: (query?: string) =>
    query
      ? (['tags', 'search', query] as const)
      : (['tags', 'search'] as const),
  TAGS_SUGGESTIONS: (imageId?: number, currentTags?: string[]) =>
    imageId
      ? (['tags', 'suggestions', imageId, currentTags] as const)
      : (['tags', 'suggestions'] as const),
}

export default QUERIES
