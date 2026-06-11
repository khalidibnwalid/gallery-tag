import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

export default async function removeHandler(
  _: Electron.IpcMainInvokeEvent,
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
      `Removing ${tagIds.length} tags from ${imagesIds.length} images`,
    )

    const database = db.getFirstDatabase()
    if (!database)
      throw new Error(
        'No active database connection found. Please load a folder first.',
      )

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
