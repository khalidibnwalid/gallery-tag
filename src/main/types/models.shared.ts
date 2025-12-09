export interface ImageModel {
  id: number
  filePath: string
  fileName: string
  extension: string
  size: number
  createdAt: string
  modifiedAt: string
  lastScanned: string
  thumbnailPath?: string
}

export interface TagModel {
  id: number
  name: string
  color?: string
  createdAt: string
  parentId?: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    offset: number
    size: number
    total: number
    hasMore: boolean
  }
}
