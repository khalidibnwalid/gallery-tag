import { ImageRepository } from '@main/utils/repositories/Image'
import { extractExif } from '@main/utils/files/exif'

let isScanning = false
let shouldRescan = false

export function scanExif(imageRepo: ImageRepository): void {
  if (isScanning) {
    shouldRescan = true
    return
  }

  isScanning = true
  ;(async () => {
    try {
      while (true) {
        const unscannedImages = imageRepo.getImagesWithoutExif()
        if (unscannedImages.length === 0) break

        const batch = unscannedImages.slice(0, 50)
        console.log(
          `Backfilling EXIF metadata for ${batch.length} images (out of ${unscannedImages.length} remaining)...`,
        )

        await Promise.allSettled(
          batch.map(async img => {
            try {
              const exif = await extractExif(img.filePath)
              imageRepo.updateImageExif(
                img.id,
                exif ? JSON.stringify(exif) : '{}',
              )
            } catch (error) {
              // Mark as empty object so we don't query it again and get stuck in a loop
              imageRepo.updateImageExif(img.id, '{}')
            }
          }),
        )

        console.log('Background EXIF backfill batch complete')

        if (shouldRescan) {
          shouldRescan = false
        } else {
          break
        }
      }
    } catch (err) {
      console.error('Error in background EXIF scan:', err)
    } finally {
      isScanning = false
      shouldRescan = false
    }
  })()
}
