import { SuggestedTag } from '@main/types/api.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

export default async function getSuggestionsHandler(
  _event: Electron.IpcMainInvokeEvent,
  {
    imageId,
    limit,
    neighborCount,
    excludeTagNames,
  }: {
    imageId: number
    limit?: number
    neighborCount?: number
    excludeTagNames?: string[]
  },
): Promise<SuggestedTag[]> {
  if (!imageId) return []

  try {
    const database = db.getFirstDatabase()
    if (!database) {
      throw new Error(
        'No active database connection found. Please load a folder first.',
      )
    }

    const tagRepo = new TagRepository(database)
    return tagRepo.getSuggestedTagsForImage({
      imageId,
      limit,
      neighborCount,
      excludeTagNames,
    })
  } catch (error) {
    console.error('Error getting suggested tags:', error)
    throw error
  }
}
