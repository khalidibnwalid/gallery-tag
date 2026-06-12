import { ImageRepository } from '@main/utils/repositories/Image'
import { computeFileHash } from '@main/utils/files/hashing'

let isScanning = false
let shouldRescan = false

export function scanHashes(imageRepo: ImageRepository): void {
  if (isScanning) {
    shouldRescan = true
    return
  }

  isScanning = true
  ;(async () => {
    try {
      while (true) {
        const unhashedImages = imageRepo.getImagesWithoutHash()
        if (unhashedImages.length === 0) break

        const batch = unhashedImages.slice(0, 50)
        console.log(
          `Backfilling hashes for ${batch.length} images (out of ${unhashedImages.length} remaining)...`,
        )

        await Promise.allSettled(
          batch.map(async img => {
            try {
              const hash = await computeFileHash(img.filePath)
              imageRepo.updateImageHash(img.id, hash)
            } catch (error) {
              // Ignore errors for individual files
            }
          }),
        )

        console.log('Background hash backfill batch complete')

        if (shouldRescan) {
          shouldRescan = false
        } else {
          break
        }
      }
    } catch (err) {
      console.error('Error in background hash scan:', err)
    } finally {
      isScanning = false
      shouldRescan = false
    }
  })()
}
