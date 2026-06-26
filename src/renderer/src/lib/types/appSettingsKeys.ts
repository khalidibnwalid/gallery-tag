export const APP_SETTING_KEYS = {
  // CLIP
  // array of available CLIP model identifiers (HuggingFace IDs)
  CLIP_AVAILABLE_MODELS: 'clip.available_models',
  // Currently selected CLIP model
  CLIP_CURRENT_MODEL: 'clip.current_model',
  // Cosine-similarity threshold for text-to-image search (0–1, higher = stricter)
  CLIP_TEXT_TO_IMAGE_THRESHOLD: 'clip.text_to_image_threshold',
  // Cosine-similarity threshold for image-to-image search (0–1, higher = stricter)
  CLIP_IMAGE_TO_IMAGE_THRESHOLD: 'clip.image_to_image_threshold',
  // Enable or disable CLIP AI indexing entirely
  CLIP_ENABLED: 'clip.enabled',

  // Thumbnails
  // WebP quality for generated thumbnails (1–100).
  // null → use sharp's default (lossless / full quality).
  THUMBNAIL_QUALITY: 'thumbnail.quality',

  // Keybindings
  KEYBINDS: 'keybinds',
} as const

export interface ClipModelConfig {
  id: string
  name: string
  dimension: number
  processor?: string
  [key: string]: any
}

export type AppSettingKey =
  (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS]

// Defaults
export const CLIP_AVAILABLE_MODELS_DEFAULT: ClipModelConfig[] = [
  {
    id: 'Xenova/clip-vit-base-patch16',
    name: 'Xenova/clip-vit-base-patch16',
    dimension: 512,
  },
  {
    id: 'Xenova/clip-vit-base-patch32',
    name: 'Xenova/clip-vit-base-patch32',
    dimension: 512,
  },
  {
    id: 'Xenova/clip-vit-large-patch14',
    name: 'Xenova/clip-vit-large-patch14',
    dimension: 768,
  },
  {
    id: 'jinaai/jina-clip-v1',
    name: 'jinaai/jina-clip-v1',
    dimension: 768,
    processor: 'Xenova/clip-vit-base-patch32',
  },
  {
    id: 'Xenova/siglip-base-patch16-224',
    name: 'Xenova/siglip-base-patch16-224',
    dimension: 768,
  },
]

export const CLIP_DEFAULT_MODEL = CLIP_AVAILABLE_MODELS_DEFAULT[0].id
export const CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT = 0.2
export const CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT = 0.6
export const THUMBNAIL_QUALITY_DEFAULT: number | null = null
