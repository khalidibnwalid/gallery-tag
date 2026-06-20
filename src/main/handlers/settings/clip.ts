import { ipcMain } from 'electron'
import { join } from 'path'
import { deleteFileToTrash } from '@main/utils/files/delete'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import { ImageRepository } from '@main/utils/repositories/Image'
import { scanEmbeddings } from '@main/utils/files/scan/scanEmbeddings'
import { CONFIG_DIR } from '@main/utils/files/config'
import { clipService } from '@main/services/clip.service'
import {
  APP_SETTING_KEYS,
  CLIP_AVAILABLE_MODELS_DEFAULT,
  CLIP_DEFAULT_MODEL,
  ClipModelConfig,
} from '@main/utils/appSettingsKeys'
import { getActiveDb } from './utils'

// Helper to sanitize table name
function getTableName(modelId: string): string {
  return 'vec_images_' + modelId.replace(/[^a-zA-Z0-9_]/g, '_')
}

// Helper to recreate table if dimensions mismatch or if recreating active model
function ensureVectorTable(
  database: any,
  tableName: string,
  dimension: number,
) {
  const tableInfo = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { sql: string } | undefined

  if (tableInfo) {
    const match = tableInfo.sql.match(/float\[(\d+)\]/)
    if (match) {
      const existingDim = parseInt(match[1], 10)
      if (existingDim !== dimension) {
        console.log(
          `Dimension mismatch for ${tableName}: existing=${existingDim}, new=${dimension}. Dropping table...`,
        )
        database.exec(`DROP TABLE ${tableName}`)
      }
    }
  }

  database.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} USING vec0(
      image_id integer primary key,
      embedding float[${dimension}] distance_metric=cosine
    )
  `)
}

export function registerClipHandlers() {
  ipcMain.handle(
    'settings:reindex-clip',
    async (_event, folderPath: string): Promise<number> => {
      try {
        const { database, rootPath } = getActiveDb(folderPath)

        // 1. Force reload model name from settings and re-init CLIP Service
        clipService.loadSettingsFromDb(database)
        await clipService.init(join(folderPath, CONFIG_DIR))

        // 2. Dynamically ensure the virtual table exists for this model
        const currentDim = clipService.getEmbeddingDimension()
        const tableName = clipService.getVectorTableName()
        ensureVectorTable(database, tableName, currentDim)

        const imageRepo = new ImageRepository(database, rootPath)

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

  ipcMain.handle(
    'settings:clear-model-index',
    async (_event, modelId: string, folderPath: string): Promise<void> => {
      try {
        const { database } = getActiveDb(folderPath)
        const tableName = getTableName(modelId)

        database.exec(`DROP TABLE IF EXISTS ${tableName}`)
        console.log(`[clearModelIndex] Dropped table ${tableName}`)

        // If it is the current model, recreate it so search queries don't crash
        const repo = new AppSettingsRepository(database)
        const currentModel = repo.getParsedValue<string>(
          APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
        )

        if (currentModel === modelId) {
          clipService.loadSettingsFromDb(database)
          await clipService.init(join(folderPath, CONFIG_DIR))
          const currentDim = clipService.getEmbeddingDimension()
          ensureVectorTable(database, tableName, currentDim)
          console.log(
            `[clearModelIndex] Recreated empty table ${tableName} for active model`,
          )
        }
      } catch (e) {
        console.error('Error in clear-model-index:', e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:delete-model',
    async (_event, modelId: string, folderPath: string): Promise<void> => {
      try {
        const { database } = getActiveDb(folderPath)

        // 1. Drop the table
        const tableName = getTableName(modelId)
        database.exec(`DROP TABLE IF EXISTS ${tableName}`)
        console.log(`[deleteModel] Dropped table ${tableName}`)

        // 2. Remove it from CLIP_AVAILABLE_MODELS setting
        const repo = new AppSettingsRepository(database)
        const models = (repo.getParsedValue<any[]>(
          APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
        ) || CLIP_AVAILABLE_MODELS_DEFAULT) as ClipModelConfig[]
        const updatedModels = models.filter(m => m.id !== modelId)

        repo.setSetting(
          APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
          updatedModels,
          'json_array',
        )
        console.log(`[deleteModel] Removed ${modelId} from available models`)

        // 3. Delete downloaded model files from config folder to free up space
        const modelFolder = join(
          folderPath,
          CONFIG_DIR,
          'models',
          `models--${modelId.replace(/\//g, '--')}`,
        )
        await deleteFileToTrash(modelFolder)

        // 4. If it was active, switch to default
        const currentModel = repo.getParsedValue<string>(
          APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
        )
        if (currentModel === modelId) {
          const defaultModel = CLIP_DEFAULT_MODEL
          repo.setSetting(
            APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
            defaultModel,
            'string',
          )
          console.log(
            `[deleteModel] Deleting active model; switching default to ${defaultModel}`,
          )

          clipService.loadSettingsFromDb(database)
          await clipService.init(join(folderPath, CONFIG_DIR))

          const defaultTableName = getTableName(defaultModel)
          const defaultDim = clipService.getEmbeddingDimension()
          ensureVectorTable(database, defaultTableName, defaultDim)
        }
      } catch (e) {
        console.error('Error in delete-model:', e)
        throw e
      }
    },
  )

  ipcMain.handle(
    'settings:partial-reindex',
    async (
      _event,
      folderPath: string,
    ): Promise<{ isUnused: boolean; missingCount: number }> => {
      try {
        const { database, rootPath } = getActiveDb(folderPath)

        // 1. Force reload model name from settings and re-init CLIP Service
        clipService.loadSettingsFromDb(database)
        await clipService.init(join(folderPath, CONFIG_DIR))

        // 2. Dynamically ensure the virtual table exists for this model
        const currentDim = clipService.getEmbeddingDimension()
        const tableName = clipService.getVectorTableName()
        ensureVectorTable(database, tableName, currentDim)

        // Check if it is unused (meaning 0 embeddings exist for it)
        let isUnused = true
        try {
          const row = database
            .prepare(`SELECT count(*) as count FROM ${tableName}`)
            .get() as { count: number }
          if (row && row.count > 0) {
            isUnused = false
          }
        } catch (e) {
          isUnused = true
        }

        const imageRepo = new ImageRepository(database, rootPath)

        // 3. Get images missing embeddings
        const missingCount = imageRepo.getImagesWithoutEmbeddings().length

        // 4. scanEmbeddings handles the background loop
        scanEmbeddings(imageRepo, folderPath)

        return { isUnused, missingCount }
      } catch (e) {
        console.error('Error in partial-reindex:', e)
        throw e
      }
    },
  )

  ipcMain.handle('settings:get-indexed-models', async (_event, folderPath: string): Promise<string[]> => {
    try {
      const { database } = getActiveDb(folderPath)
      const rows = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'vec_images_%'",
        )
        .all() as { name: string }[]

      const mainTables = rows
          .map(r => r.name)
          .filter(
            name =>
              !name.endsWith('_node') &&
              !name.endsWith('_rowid') &&
              !name.endsWith('_parent') &&
              !name.endsWith('_properties'),
          )

      return mainTables
    } catch (e) {
      console.error('Error getting indexed models:', e)
      return []
    }
  })
}
