import { SuggestedTag } from '@main/types/api.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

import { join } from 'path'

export default async function getSuggestionsHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
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
    if (!folderPath) {
      throw new Error('folderPath is required')
    }

    const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
    const database = db.getDatabase(dbPath)

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
