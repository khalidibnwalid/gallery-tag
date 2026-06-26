import { notifier } from '@main/services/notifier.service'
import { ImageUpdatePayload } from '@main/types/api.shared'
import { EVENTS } from '@main/types/constants.shared'
import { ImageModel } from '@main/types/models.shared'
import { CONFIG_DIR, getAndInitConfig } from '@main/utils/files/config'
import { EXTENSIONS, getFilesByExtension } from '@main/utils/files/getFiles'
import {
  scanColors,
  scanEmbeddings,
  scanHashes,
  scanNewFiles,
} from '@main/utils/files/scan'
import { toAbsolutePath } from '@main/utils/pathUtils'
import { FolderRepository } from '@main/utils/repositories/Folder'
import { ImageRepository } from '@main/utils/repositories/Image'
import watcher from '@parcel/watcher'
import fs from 'fs/promises'
import { join } from 'path'
import { runExclusiveSync } from '../utils/locks'

class WatcherService {
  private activeFolderPath: string | null = null
  private subscription: any = null

  async watchFolder(folderPath: string, sender: Electron.WebContents) {
    if (this.activeFolderPath === folderPath) return

    // Unsubscribe from previous folder watcher
    if (this.subscription) {
      try {
        await this.subscription.unsubscribe()
        console.log(
          `Unsubscribed from previous folder watcher: ${this.activeFolderPath}`,
        )
      } catch (err) {
        console.error('Failed to unsubscribe from watcher:', err)
      }
      this.subscription = null
      this.activeFolderPath = null
    }

    this.activeFolderPath = folderPath

    try {
      this.subscription = await watcher.subscribe(
        folderPath,
        async (err, events) => {
          if (err) {
            console.error(`Watcher error for ${folderPath}:`, err)
            return
          }

          // Filter out events inside the CONFIG_DIR (.gallery) to avoid infinite loops
          const configDirPrefix = join(folderPath, CONFIG_DIR)
          const relevantEvents = events.filter(
            e => !e.path.startsWith(configDirPrefix),
          )

          if (relevantEvents.length === 0) return

          console.log(
            `Watcher detected ${relevantEvents.length} changes in ${folderPath}. Syncing...`,
          )

          try {
            await this.syncFolder(folderPath, sender)
          } catch (syncErr) {
            console.error('Error during watcher sync:', syncErr)
          }
        },
      )
      console.log(`Folder watcher started for: ${folderPath}`)
    } catch (err) {
      console.error(`Failed to start watcher for ${folderPath}:`, err)
    }
  }

  async syncFolder(folderPath: string, sender: Electron.WebContents) {
    await runExclusiveSync(folderPath, async () => {
      const { db: database } = await getAndInitConfig(folderPath)
      const folderRepo = new FolderRepository(database, folderPath)
      const imageRepo = new ImageRepository(database, folderPath)

      // 1. Sync folders from disk
      await folderRepo.syncFoldersFromDisk(folderPath)

      // 1b. Check if any database folders are missing on disk, and soft-delete them
      const activeFolders = database
        .prepare('SELECT id, path FROM folders WHERE deleted_at IS NULL')
        .all() as { id: number; path: string }[]

      for (const f of activeFolders) {
        if (f.path === '/') continue
        const absPath = toAbsolutePath(folderPath, f.path)
        let exists = false
        try {
          const stat = await fs.stat(absPath)
          exists = stat.isDirectory()
        } catch {}

        if (!exists) {
          console.log(
            `Watcher: Folder ${absPath} went missing from disk. Soft-deleting...`,
          )
          folderRepo.softDeleteFolder(f.id)
        }
      }

      // 2. Scan images
      const imageFiles = await getFilesByExtension(
        folderPath,
        EXTENSIONS.IMAGES,
        CONFIG_DIR,
      )

      const currentPaths = imageFiles.map(file => file.fullPath)

      // 3. Find missing images to notify renderer
      const missing = imageRepo.getImagesMissingFromPaths(currentPaths)
      if (missing.length > 0) {
        console.log(
          `Watcher: ${missing.length} images went missing from disk. Soft-deleting...`,
        )

        // Perform soft delete
        imageRepo.markMissingImagesAsDeleted(currentPaths)

        // Notify renderer
        sender.send(EVENTS.UPDATE_IMAGE, {
          type: 'update',
          payload: {
            images: missing.map(img => ({
              id: img.id,
              filePath: `deleted://${img.id}`,
              deletedAt: new Date().toISOString(),
            })),
          } satisfies ImageUpdatePayload,
        })
      }

      // 4. Same-path recovery for images that reappeared
      const softDeletedAtCurrentPaths =
        imageRepo.getSoftDeletedImagesAtPaths(currentPaths)
      if (softDeletedAtCurrentPaths.length > 0) {
        const currentFileMap = new Map(imageFiles.map(f => [f.fullPath, f]))
        const recoveredImages: Pick<
          ImageModel,
          'id' | 'filePath' | 'fileName'
        >[] = []
        for (const img of softDeletedAtCurrentPaths) {
          const fileInfo = currentFileMap.get(img.filePath)
          if (fileInfo) {
            imageRepo.recoverImage(img.id, fileInfo)
            recoveredImages.push({
              id: img.id,
              filePath: img.filePath,
              fileName: img.fileName,
            })
            console.log(`Watcher same-path recovery: ${img.filePath}`)
          }
        }
        if (recoveredImages.length > 0) {
          sender.send(EVENTS.UPDATE_IMAGE, {
            type: 'update',
            payload: {
              images: recoveredImages,
            } satisfies ImageUpdatePayload,
          })
        }
      }

      // 5. Process new files (inserting and creating thumbnails)
      await scanNewFiles(
        imageRepo,
        sender,
        folderPath,
        imageFiles,
        currentPaths,
        database,
      )

      // 6. Background tasks
      scanHashes(imageRepo)
      scanColors(imageRepo)
      scanEmbeddings(imageRepo, folderPath)

      // Notify UI that library/folders changed on disk
      notifier.notify({
        id: 'library-changed',
        type: 'status',
        payload: { folderPath },
      })
    })
  }

  async stopWatcher() {
    if (this.subscription) {
      await this.subscription.unsubscribe()
      this.subscription = null
      this.activeFolderPath = null
      console.log('Folder watcher stopped.')
    }
  }
}

export const watcherService = new WatcherService()
