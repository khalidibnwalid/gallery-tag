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
  TAGS: (folderPath?: string) =>
    folderPath ? (['tags', folderPath] as const) : (['tags'] as const),
  TAGS_SEARCH: (folderPath?: string, query?: string) => {
    const key: (number | string)[] = ['tags', 'search']
    if (folderPath) key.push(folderPath)
    if (query) key.push(query)
    return key as readonly (number | string)[]
  },
  TAGS_SUGGESTIONS: (
    folderPath?: string,
    imageId?: number,
    currentTags?: string[],
  ) => {
    const key: (number | string | string[])[] = ['tags', 'suggestions']
    if (folderPath) key.push(folderPath)
    if (imageId) key.push(imageId)
    if (currentTags) key.push(currentTags)
    return key as readonly (number | string | string[])[]
  },
}

export default QUERIES
