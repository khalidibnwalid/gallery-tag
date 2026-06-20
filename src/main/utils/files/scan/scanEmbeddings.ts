import { notifier } from '@main/services/notifier.service'
import { clipService } from '@main/services/clip.service'
import {
  NOTIFIER_EVENTS,
  NOTIFIER_EVENT_TYPES,
} from '@main/types/constants.shared'
import { CONFIG_DIR } from '@main/utils/files/config'
import { ImageRepository } from '@main/utils/repositories/Image'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import { join } from 'path'

const activeScans = new Set<string>()
const pendingRescans = new Set<string>()

export function scanEmbeddings(
  imageRepo: ImageRepository,
  folderPath: string,
): void {
  const settingsRepo = new AppSettingsRepository(imageRepo.db)
  const clipEnabled = settingsRepo.getParsedValue<boolean>('clip.enabled') ?? true
  if (!clipEnabled) {
    console.log('CLIP embedding generation is disabled for this folder.')
    return
  }

  if (activeScans.has(folderPath)) {
    pendingRescans.add(folderPath)
    return
  }

  activeScans.add(folderPath)
  ;(async () => {
    try {
      while (true) {
        const unembedded = imageRepo.getImagesWithoutEmbeddings()
        if (unembedded.length === 0) {
          break
        }

        console.log(
          `CLIP: Starting embedding generation for ${unembedded.length} images...`,
        )

        await clipService.init(join(folderPath, CONFIG_DIR))

        const sessionId = Date.now().toString()
        let order = 0

        notifier.notify({
          id: NOTIFIER_EVENTS.IMAGES.EMBEDDING_GENERATED,
          type: NOTIFIER_EVENT_TYPES.PROGRESS_PART,
          payload: {
            order: 0,
            total: unembedded.length,
            sessionId,
          },
        })

        let totalProcessed = 0
        let totalFailed = 0

        for (const img of unembedded) {
          try {
            const embedding = await clipService.getImageEmbedding(img.filePath)
            imageRepo.insertImageEmbedding(img.id, embedding)
            totalProcessed++
          } catch (error) {
            console.error(
              `Failed to generate embedding for ${img.filePath}:`,
              error,
            )
            totalFailed++
          }

          order++
          notifier.notify({
            id: NOTIFIER_EVENTS.IMAGES.EMBEDDING_GENERATED,
            type: NOTIFIER_EVENT_TYPES.PROGRESS_PART,
            payload: {
              order,
              total: unembedded.length,
              sessionId,
            },
          })
        }

        console.log(
          `CLIP: Embedding generation complete. Processed ${totalProcessed}, failed ${totalFailed}`,
        )
        notifier.notify({
          id: NOTIFIER_EVENTS.IMAGES.EMBEDDING_GENERATED,
          type: NOTIFIER_EVENT_TYPES.PROGRESS_COMPLETE,
          payload: {
            totalProcessed,
            totalFailed,
            sessionId,
          },
        })

        // Check if a rescan was requested during this run
        if (pendingRescans.has(folderPath)) {
          pendingRescans.delete(folderPath)
          // loop will run again to check for new files
        } else {
          break
        }
      }
    } catch (err) {
      console.error('Error in background embedding generation:', err)
    } finally {
      activeScans.delete(folderPath)
      pendingRescans.delete(folderPath)
    }
  })()
}
