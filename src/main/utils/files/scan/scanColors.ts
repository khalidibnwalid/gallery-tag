import { ImageRepository } from '@main/utils/repositories/Image'
import { extractDominantColors } from '@main/utils/files/colorExtractor'

let isScanning = false
let shouldRescan = false

export function scanColors(imageRepo: ImageRepository): void {
  if (isScanning) {
    shouldRescan = true
    return
  }

  isScanning = true
  ;(async () => {
    try {
      while (true) {
        const colorlessImages = imageRepo.getImagesWithoutDominantColors()
        if (colorlessImages.length === 0) {
          break
        }

        const batch = colorlessImages.slice(0, 50)
        console.log(
          `Backfilling dominant colors for ${batch.length} images (out of ${colorlessImages.length} remaining)...`,
        )

        await Promise.allSettled(
          batch.map(async img => {
            try {
              let colors = img.dominantColors
              if (!colors || colors.length === 0) {
                colors = await extractDominantColors(img.filePath)
              }
              imageRepo.updateImageDominantColors(img.id, colors)
            } catch (error) {
              // Ignore errors for individual files
            }
          }),
        )

        console.log('Background dominant colors backfill batch complete')

        if (shouldRescan) {
          shouldRescan = false
        } else {
          break
        }
      }
    } catch (err) {
      console.error('Error in background colors scan:', err)
    } finally {
      isScanning = false
      shouldRescan = false
    }
  })()
}
