import { notifier } from '@main/services/notifier.service'
import { clipService } from '@main/services/clip.service'
import { NOTIFIER_EVENTS, NOTIFIER_EVENT_TYPES } from '@main/types/constants.shared'
import { CONFIG_DIR } from '@main/utils/files/config'
import { ImageRepository } from '@main/utils/repositories/Image'
import { join } from 'path'

export function scanEmbeddings(
  imageRepo: ImageRepository,
  folderPath: string,
): void {
  const unembedded = imageRepo.getImagesWithoutEmbeddings()
  if (unembedded.length === 0) return

  console.log(
    `CLIP: Starting embedding generation for ${unembedded.length} images...`,
  )

  ;(async () => {
    try {
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
    } catch (err) {
      console.error('Error in background embedding generation:', err)
    }
  })()
}
