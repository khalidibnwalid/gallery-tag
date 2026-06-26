import { SearchFilter } from '@main/types/api.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'
import { resolveImageIdsFromFilter } from '@main/utils/queryHelper'

import { join } from 'path'

export default async function removeHandler(
  _: Electron.IpcMainInvokeEvent,
  folderPath: string,
  {
    tagIds,
    imagesIds,
    filter,
  }: {
    tagIds: number[]
    imagesIds?: number[]
    filter?: SearchFilter
  },
): Promise<void> {
  let resolvedImageIds = imagesIds ? [...imagesIds] : []
  if (filter) {
    const idsFromFilter = await resolveImageIdsFromFilter(folderPath, filter)
    resolvedImageIds = Array.from(new Set([...resolvedImageIds, ...idsFromFilter]))
  }

  if (!tagIds || tagIds.length === 0 || resolvedImageIds.length === 0)
    return

  try {
    console.log(
      `Removing ${tagIds.length} tags from ${resolvedImageIds.length} images for folder: ${folderPath}`,
    )

    if (!folderPath) {
      throw new Error('folderPath is required')
    }

    const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
    const database = db.getDatabase(dbPath)

    const tagRepo = new TagRepository(database)
    tagRepo.removeTagsFromImages(tagIds, resolvedImageIds)

    console.log(
      `Successfully removed ${tagIds.length} tags from ${resolvedImageIds.length} images`,
    )
  } catch (error) {
    console.error('Error removing tags:', error)
    throw error
  }
}
