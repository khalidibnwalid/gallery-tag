export interface FileInfo {
  // file information
  fileName: string
  fullPath: string
  relativePath: string
  directory: string
  extension: string

  // stats
  size: number
  sizeFormatted: string
  createdAt: Date
  modifiedAt: Date
  accessedAt: Date
}
