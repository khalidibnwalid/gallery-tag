import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

export default async function deleteHandler(
  _: Electron.IpcMainInvokeEvent,
  { tagId }: { tagId: number },
): Promise<void> {
  if (!tagId) throw new Error('Invalid tag id')

  try {
    const database = db.getFirstDatabase()
    if (!database)
      throw new Error(
        'No active database connection found. Please load a folder first.',
      )

    const tagRepo = new TagRepository(database)
    const deleted = tagRepo.deleteTag(tagId)
    if (!deleted) throw new Error('Tag not found')
  } catch (error) {
    console.error('Error deleting tag:', error)
    throw error
  }
}
