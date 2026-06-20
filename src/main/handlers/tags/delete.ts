import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

import { join } from 'path'

export default async function deleteHandler(
  _: Electron.IpcMainInvokeEvent,
  folderPath: string,
  { tagId }: { tagId: number },
): Promise<void> {
  if (!tagId) throw new Error('Invalid tag id')

  try {
    if (!folderPath) {
      throw new Error('folderPath is required')
    }

    const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
    const database = db.getDatabase(dbPath)

    const tagRepo = new TagRepository(database)
    const deleted = tagRepo.deleteTag(tagId)
    if (!deleted) throw new Error('Tag not found')
  } catch (error) {
    console.error('Error deleting tag:', error)
    throw error
  }
}
