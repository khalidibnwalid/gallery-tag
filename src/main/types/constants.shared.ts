export const EVENTS = {
  UPDATE_IMAGE: 'update-image',
  NOTIFY: 'notify',
} as const

export const NOTIFIER_EVENTS = {
  IMAGES: {
    THUMBNAIL_GENERATED: 'image-thumbnail-generated',
  } as const,
} as const

export const NOTIFIER_EVENT_TYPES = {
  PROGRESS_COMPLETE: 'progress.complete',
  PROGRESS_PART: 'progress.part',
} as const
