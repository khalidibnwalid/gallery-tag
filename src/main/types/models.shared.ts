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
