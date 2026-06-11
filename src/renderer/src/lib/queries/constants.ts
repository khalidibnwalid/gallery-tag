const QUERIES = {
  IMAGES: (folderPath?: string) =>
    folderPath ? (['images', folderPath] as const) : (['images'] as const),
  IMAGES_PAGINATED: (
    folderPath?: string,
    filter?: { text?: string; filterPath?: string; tags?: string[] },
  ) => {
    const key: any[] = ['images', 'paginated']
    if (folderPath) key.push(folderPath)
    if (filter !== undefined) key.push(filter)
    return key as readonly any[]
  },
  IMAGES_SEARCH: (query?: string) =>
    query
      ? (['images', 'search', query] as const)
      : (['images', 'search'] as const),

  TAGS: () => ['tags'] as const,
  TAGS_SEARCH: (query?: string) =>
    query
      ? (['tags', 'search', query] as const)
      : (['tags', 'search'] as const),
}

export default QUERIES
