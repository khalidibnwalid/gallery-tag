import { AppSettingModel, SettingValue } from '@main/types/models.shared'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import { ImageRepository } from '@main/utils/repositories/Image'
import { db } from '@main/utils/repositories/db'
import { ipcMain } from 'electron'
import { createThumbnails, getThumbnailQuality } from '@main/services/thumbnails.service'
import { scanEmbeddings } from '@main/utils/files/scan/scanEmbeddings'
import { THUMBNAILS_DIR, CONFIG_DIR } from '@main/utils/files/config'
import { clipService } from '@main/services/clip.service'
import { join, basename } from 'path'
import fs from 'fs/promises'
import { EVENTS } from '@main/types/constants.shared'
import { ImageUpdatePayload } from '@main/types/api.shared'
import Batcher from '@main/utils/batcher'

function getSettingsRepo(): AppSettingsRepository {
  const connectedPaths = db.getConnectedPaths()
  if (connectedPaths.length === 0) {
    throw new Error(
      'No active database connection found. Please load a folder first.',
    )
  }
  const database = db.getDatabase(connectedPaths[0])
  return new AppSettingsRepository(database)
}

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get-all', async (): Promise<AppSettingModel[]> => {
    try {
      const repo = getSettingsRepo()
      return repo.getAllSettings()
    } catch (e) {
      console.error('Error getting settings:', e)
      throw e
    }
  })

  ipcMain.handle(
    'settings:get',
    async (_event, key: string): Promise<AppSettingModel | undefined> => {
      try {
        const repo = getSettingsRepo()
        return repo.getSetting(key)
      } catch (e) {
        console.error(`Error getting setting ${key}:`, e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:get-value',
    async (_event, key: string): Promise<SettingValue | undefined> => {
      try {
        const repo = getSettingsRepo()
        return repo.getParsedValue(key)
      } catch (e) {
        console.error(`Error getting setting value ${key}:`, e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:set',
    async (
      _event,
      key: string,
      value: SettingValue,
      valueType:
        | 'string'
        | 'number'
        | 'boolean'
        | 'json'
        | 'json_array' = 'string',
    ): Promise<void> => {
      try {
        const repo = getSettingsRepo()
        repo.setSetting(key, value, valueType as any)
      } catch (e) {
        console.error(`Error setting setting ${key}:`, e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:delete',
    async (_event, key: string): Promise<void> => {
      try {
        const repo = getSettingsRepo()
        repo.deleteSetting(key)
      } catch (e) {
        console.error(`Error deleting setting ${key}:`, e)
        throw e
      }
    },
  )


  ipcMain.handle(
    'settings:regenerate-thumbnails',
    async (_event, folderPath: string): Promise<number> => {
      try {
        const connectedPaths = db.getConnectedPaths()
        if (connectedPaths.length === 0)
          throw new Error('No active database connection. Load a folder first.')

        const database = db.getDatabase(connectedPaths[0])
        const imageRepo = new ImageRepository(database)

        // 1. Wipe stored thumbnail paths
        const cleared = imageRepo.clearAllThumbnailPaths()
        console.log(`[regenerateThumbnails] Cleared ${cleared} thumbnail paths`)

        // Delete existing thumbnail files from the filesystem
        const thumbDir = join(folderPath, THUMBNAILS_DIR)
        try {
          await fs.rm(thumbDir, { recursive: true, force: true })
          await fs.mkdir(thumbDir, { recursive: true })
          console.log(`[regenerateThumbnails] Cleaned thumbnail directory: ${thumbDir}`)
        } catch (err) {
          console.error(`[regenerateThumbnails] Failed to clear thumbnail directory:`, err)
        }

        // 2. Fetch all active images
        const images = imageRepo.getAllActiveImages()
        if (images.length === 0) return 0

        // Notify the frontend that old thumbnails are cleared so the UI updates
        _event.sender.send(EVENTS.UPDATE_IMAGE, {
          type: 'update',
          payload: {
            images: images.map((img) => ({
              filePath: img.filePath,
              thumbnailPath: '',
            })),
          } satisfies ImageUpdatePayload,
        })

        const quality = getThumbnailQuality(database) ?? undefined
        const ts = Date.now()
        let counter = 0

        const imageUpdateBatcher = new Batcher<{
          filePath: string
          thumbnailPath: string
        }>({
          batchSize: 50,
          debounceTime: 500,
          callbackFn: (batch) => {
            _event.sender.send(EVENTS.UPDATE_IMAGE, {
              type: 'update',
              payload: { images: batch } satisfies ImageUpdatePayload,
            })
          },
        })

        // 3. Re-generate in the background
        createThumbnails({
          tasks: images.map(img => ({
            imagePath: img.filePath,
            outputPath: join(
              folderPath,
              THUMBNAILS_DIR,
              basename(img.filePath) + '_' + ts + '_' + counter++ + '_.webp',
            ),
          })),
          onProgress(result) {
            if (result.success) {
              imageRepo.updateThumbnailPaths([{
                filePath: result.imagePath,
                thumbnailPath: result.outputPath,
              }])
              imageUpdateBatcher.add({
                filePath: result.imagePath,
                thumbnailPath: result.outputPath,
              })
            }
          },
          onComplete(result) {
            imageUpdateBatcher.flush()
            console.log(
              `[regenerateThumbnails] Done: ${result.totalProcessed} ok, ${result.totalFailed} failed`,
            )
          },
          onError(err) {
            console.error('[regenerateThumbnails] Error:', err)
          },
          thumbnailOptions: { width: 512, quality },
        })

        return images.length
      } catch (e) {
        console.error('Error in regenerate-thumbnails:', e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:reindex-clip',
    async (_event, folderPath: string): Promise<number> => {
      try {
        const connectedPaths = db.getConnectedPaths()
        if (connectedPaths.length === 0)
          throw new Error('No active database connection. Load a folder first.')

        const database = db.getDatabase(connectedPaths[0])

        // 1. Force reload model name from settings and re-init CLIP Service
        clipService.loadSettingsFromDb(database)
        await clipService.init(join(folderPath, CONFIG_DIR))

        // 2. Dynamically ensure the virtual table exists for this model
        const currentDim = clipService.getEmbeddingDimension()
        const tableName = clipService.getVectorTableName()

        const tableInfo = database
          .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(tableName) as { sql: string } | undefined

        if (tableInfo) {
          const match = tableInfo.sql.match(/float\[(\d+)\]/)
          if (match) {
            const existingDim = parseInt(match[1], 10)
            if (existingDim !== currentDim) {
              console.log(
                `Dimension mismatch for ${tableName}: existing=${existingDim}, new=${currentDim}. Dropping table to allow re-indexing...`,
              )
              database.exec(`DROP TABLE ${tableName}`)
            }
          }
        }

        database.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} USING vec0(
            image_id integer primary key,
            embedding float[${currentDim}] distance_metric=cosine
          )
        `)

        const imageRepo = new ImageRepository(database)

        // 3. Wipe existing embeddings so every image re-queues
        const cleared = imageRepo.clearAllEmbeddings()
        console.log(`[reindexClip] Cleared ${cleared} embeddings`)

        // 4. scanEmbeddings handles the background loop
        scanEmbeddings(imageRepo, folderPath)

        return cleared
      } catch (e) {
        console.error('Error in reindex-clip:', e)
        throw e
      }
    },
  )
}
