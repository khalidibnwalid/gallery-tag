import { SearchFilter } from '@main/types/api.shared'
import { getAndInitConfig, CONFIG_DIR } from '@main/utils/files/config'
import { ImageRepository } from '@main/utils/repositories/Image'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import { clipService } from '@main/services/clip.service'
import { join } from 'path'

export async function resolveImageIdsFromFilter(
  folderPath: string,
  filter?: SearchFilter,
): Promise<number[]> {
  if (!folderPath) {
    return []
  }

  const { db } = await getAndInitConfig(folderPath)
  const imageRepo = new ImageRepository(db, folderPath)

  const settingsRepo = new AppSettingsRepository(db)
  const clipEnabled = settingsRepo.getParsedValue<boolean>('clip.enabled') ?? true

  let textEmbedding: Float32Array | undefined = undefined
  let imageEmbedding: Float32Array | undefined = undefined
  const hasText = !!filter?.aiSearchText
  const hasImage = !!filter?.aiSearchImage

  if (clipEnabled && (hasText || hasImage)) {
    await clipService.init(join(folderPath, CONFIG_DIR))

    if (hasText) {
      textEmbedding = await clipService.getTextEmbedding(filter!.aiSearchText!)
    }
    if (hasImage) {
      imageEmbedding = await clipService.getImageEmbedding(filter!.aiSearchImage!)
    }
  }

  return imageRepo.getImageIds(filter, textEmbedding, imageEmbedding)
}
