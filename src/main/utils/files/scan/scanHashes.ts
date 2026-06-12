import { ImageRepository } from '@main/utils/repositories/Image'
import { computeFileHash } from '@main/utils/files/hashing'

export function scanHashes(imageRepo: ImageRepository): void {
  const unhashedImages = imageRepo.getImagesWithoutHash()
  if (unhashedImages.length > 0) {
    const batch = unhashedImages.slice(0, 50)
    console.log(
      `Backfilling hashes for ${batch.length} images (out of ${unhashedImages.length} remaining)...`,
    )
    Promise.allSettled(
      batch.map(async img => {
        try {
          const hash = await computeFileHash(img.filePath)
          imageRepo.updateImageHash(img.id, hash)
        } catch (error) {
          // Ignore errors for individual files
        }
      }),
    ).then(() => {
      console.log('Background hash backfill batch complete')
    })
  }
}
