import sharp from 'sharp'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import { APP_SETTING_KEYS, THUMBNAIL_QUALITY_DEFAULT } from '@main/utils/appSettingsKeys'
import Database from 'better-sqlite3'

export interface ThumbnailTask {
  imagePath: string
  outputPath: string
}

export interface ThumbnailOptions {
  width: number
  height?: number
  quality?: number
}

export type ThumbnailResult =
  | {
      imagePath: string
      outputPath: string
      success: true
      originalWidth?: number
      originalHeight?: number
      error?: undefined
    }
  | {
      imagePath: string
      outputPath?: undefined
      success: false
      error: string
    }

export interface ThumbnailBatchResult {
  results: ThumbnailResult[]
  totalProcessed: number
  totalFailed: number
}

interface CreateThumbnailsOptions {
  tasks: ThumbnailTask[]
  onComplete?: (result: ThumbnailBatchResult) => void
  onProgress?: (
    currentResult: ThumbnailResult,
    completed: number,
    total: number,
  ) => void
  onError?: (error: Error) => void
  thumbnailOptions: ThumbnailOptions
}

/**
 * Returns the thumbnail WebP quality configured in app_settings.
 * Falls back to `THUMBNAIL_QUALITY_DEFAULT` (null → sharp's default / full quality).
 */
export function getThumbnailQuality(db: Database.Database): number | null {
  const repo = new AppSettingsRepository(db)
  const value = repo.getParsedValue<number | null>(APP_SETTING_KEYS.THUMBNAIL_QUALITY)
  // getParsedValue returns `undefined` when the key is missing, and `null` when stored as 'null'
  if (value === undefined) return THUMBNAIL_QUALITY_DEFAULT
  return value
}

export async function createThumbnails(
  options: CreateThumbnailsOptions,
): Promise<void> {
  const { tasks, onComplete, onProgress, onError, thumbnailOptions } = options

  try {
    const promises = tasks.map(async (task, index) => {
      const result = await processImage(
        task.imagePath,
        task.outputPath,
        thumbnailOptions.width,
        thumbnailOptions.height,
        thumbnailOptions.quality,
      )

      onProgress?.(result, index + 1, tasks.length)
      return result
    })

    const results = await Promise.all(promises)
    const totalFailed = results.filter(r => !r.success).length
    const totalProcessed = results.length

    const batchResult: ThumbnailBatchResult = {
      results,
      totalProcessed,
      totalFailed,
    }

    onComplete?.(batchResult)
  } catch (error) {
    if (onError) {
      onError(
        error instanceof Error ? error : new Error('Unknown error occurred'),
      )
    }
  }
}

async function processImage(
  imagePath: string,
  outputPath: string,
  width: number,
  height?: number,
  quality?: number,
): Promise<ThumbnailResult> {
  try {
    const pipeline = sharp(imagePath, { failOn: 'none' })
    const metadata = await pipeline.metadata()

    await pipeline
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality })
      .toFile(outputPath)

    return {
      imagePath,
      outputPath,
      success: true,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
    }
  } catch (error) {
    return {
      imagePath,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
