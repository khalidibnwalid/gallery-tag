const QUERIES = {
  IMAGES: (folderPath?: string) =>
    folderPath ? (['images', folderPath] as const) : (['images'] as const),
  SEARCH: (query?: string) =>
    query ? (['search', query] as const) : (['search'] as const),
}

export default QUERIES
