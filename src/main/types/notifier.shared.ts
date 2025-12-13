export interface NotifyImageThumbnailGeneratedPartPayload {
  data: {
    filePath: string
    thumbnailPath: string
  }
  order: number
  total: number
  sessionId: string
}

export interface NotifyImageThumbnailGenerationCompletePayload {
  totalProcessed: number
  totalFailed: number
  sessionId: string
}
