export const EVENTS = {
  UPDATE_IMAGE: 'update-image',
  NOTIFY: 'notify',
} as const

export const NOTIFIER_EVENTS = {
  IMAGES: {
    THUMBNAIL_GENERATED: 'image-thumbnail-generated',
    EMBEDDING_GENERATED: 'image-embedding-generation',
  } as const,
  CLIP: {
    STATUS: 'clip-status',
  } as const,
} as const

export const NOTIFIER_EVENT_TYPES = {
  PROGRESS_COMPLETE: 'progress.complete',
  PROGRESS_PART: 'progress.part',
  STATUS: 'status',
} as const
