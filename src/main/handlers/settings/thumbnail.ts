import { ipcMain } from 'electron'
import { join, basename } from 'path'
import fs from 'fs/promises'
import { ImageRepository } from '@main/utils/repositories/Image'
import {
  createThumbnails,
  getThumbnailQuality,
} from '@main/services/thumbnails.service'
import { THUMBNAILS_DIR } from '@main/utils/files/config'
import { EVENTS } from '@main/types/constants.shared'
import { ImageUpdatePayload } from '@main/types/api.shared'
import Batcher from '@main/utils/batcher'
import { getActiveDb } from './utils'

export function registerThumbnailHandlers() {
  ipcMain.handle(
    'settings:regenerate-thumbnails',
    async (_event, folderPath: string): Promise<number> => {
      try {
        const { database, rootPath } = getActiveDb(folderPath)
        const imageRepo = new ImageRepository(database, rootPath)

        // 1. Wipe stored thumbnail paths
        const cleared = imageRepo.clearAllThumbnailPaths()
        console.log(`[regenerateThumbnails] Cleared ${cleared} thumbnail paths`)

        // Delete existing thumbnail files from the filesystem
        const thumbDir = join(folderPath, THUMBNAILS_DIR)
        try {
          await fs.rm(thumbDir, { recursive: true, force: true })
          await fs.mkdir(thumbDir, { recursive: true })
          console.log(
            `[regenerateThumbnails] Cleaned thumbnail directory: ${thumbDir}`,
          )
        } catch (err) {
          console.error(
            `[regenerateThumbnails] Failed to clear thumbnail directory:`,
            err,
          )
        }

        // 2. Fetch all active images
        const images = imageRepo.getAllActiveImages()
        if (images.length === 0) return 0

        // Notify the frontend that old thumbnails are cleared so the UI updates
        _event.sender.send(EVENTS.UPDATE_IMAGE, {
          type: 'update',
          payload: {
            images: images.map(img => ({
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
          callbackFn: batch => {
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
              imageRepo.updateThumbnailPaths([
                {
                  filePath: result.imagePath,
                  thumbnailPath: result.outputPath,
                },
              ])
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
}
