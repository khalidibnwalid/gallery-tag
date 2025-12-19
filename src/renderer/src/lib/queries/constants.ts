const QUERIES = {
  IMAGES: (folderPath?: string) =>
    folderPath ? (['images', folderPath] as const) : (['images'] as const),
  IMAGES_PAGINATED: (
    folderPath?: string,
    filter?: { text?: string; filterPath?: string },
  ) =>
    folderPath
      ? (['images', 'paginated', folderPath, filter] as const)
      : (['images', 'paginated', filter] as const),
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
