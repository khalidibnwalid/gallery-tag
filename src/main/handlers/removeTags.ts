import { db } from '@main/utils/db/db'
import { removeTagsFromImages } from '@main/utils/db/tag'

export default async function removeTagsHandler(
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

    removeTagsFromImages(database, tagIds, imagesIds)

    console.log(
      `Successfully removed ${tagIds.length} tags from ${imagesIds.length} images`,
    )
  } catch (error) {
    console.error('Error removing tags:', error)
    throw error
  }
}
