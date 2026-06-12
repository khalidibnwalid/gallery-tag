import { ImageRepository } from '@main/utils/repositories/Image'
import { extractDominantColors } from '@main/utils/files/colorExtractor'

export function scanColors(imageRepo: ImageRepository): void {
  const colorlessImages = imageRepo.getImagesWithoutDominantColors()
  if (colorlessImages.length > 0) {
    const batch = colorlessImages.slice(0, 50)
    console.log(
      `Backfilling dominant colors for ${batch.length} images (out of ${colorlessImages.length} remaining)...`,
    )
    Promise.allSettled(
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
    ).then(() => {
      console.log('Background dominant colors backfill batch complete')
    })
  }
}
