import { AppSettingsRepository } from './repositories/appSettings'
import {
  APP_SETTING_KEYS,
  CLIP_AVAILABLE_MODELS_DEFAULT,
  CLIP_DEFAULT_MODEL,
  CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT,
  CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT,
  THUMBNAIL_QUALITY_DEFAULT,
} from './appSettingsKeys'
import Database from 'better-sqlite3'
import { InferValueTypeKey } from '@main/types/models.shared'

/**
 * Seeds the app_settings table with sensible defaults.
 * Uses INSERT OR IGNORE semantics so existing user preferences are never
 * overwritten – only missing rows are inserted.
 */
export function seedAppSettings(db: Database.Database): void {
  const repo = new AppSettingsRepository(db)

  // Helper: only write the setting when it doesn't already exist
  function seedIfMissing<T extends Parameters<typeof repo.setSetting>[1]>(
    key: string,
    value: T,
    valueType: InferValueTypeKey<T>,
  ): void {
    const existing = repo.getSetting(key)
    if (!existing) {
      repo.setSetting(key, value, valueType)
      console.log(`[seedAppSettings] Seeded "${key}"`)
    }
  }

  seedIfMissing(
    APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
    CLIP_AVAILABLE_MODELS_DEFAULT,
    'json_array',
  )
  seedIfMissing(
    APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
    CLIP_DEFAULT_MODEL,
    'string',
  )
  seedIfMissing(
    APP_SETTING_KEYS.CLIP_TEXT_TO_IMAGE_THRESHOLD,
    CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT,
    'number',
  )
  seedIfMissing(
    APP_SETTING_KEYS.CLIP_IMAGE_TO_IMAGE_THRESHOLD,
    CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT,
    'number',
  )
  // THUMBNAIL_QUALITY is nullable – store as 'null' string so it round-trips cleanly
  seedIfMissing(
    APP_SETTING_KEYS.THUMBNAIL_QUALITY,
    THUMBNAIL_QUALITY_DEFAULT,
    'number',
  )
}
