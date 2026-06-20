import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

import { join } from 'path'

export default async function removeHandler(
  _: Electron.IpcMainInvokeEvent,
  folderPath: string,
  {
    tagIds,
    imagesIds,
  }: {
    tagIds: number[]
    imagesIds: number[]
  },
): Promise<void> {
  if (!tagIds || tagIds.length === 0 || !imagesIds || imagesIds.length === 0)
    return

  try {
    console.log(
      `Removing ${tagIds.length} tags from ${imagesIds.length} images for folder: ${folderPath}`,
    )

    if (!folderPath) {
      throw new Error('folderPath is required')
    }

    const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
    const database = db.getDatabase(dbPath)

    const tagRepo = new TagRepository(database)
    tagRepo.removeTagsFromImages(tagIds, imagesIds)

    console.log(
      `Successfully removed ${tagIds.length} tags from ${imagesIds.length} images`,
    )
  } catch (error) {
    console.error('Error removing tags:', error)
    throw error
  }
}
