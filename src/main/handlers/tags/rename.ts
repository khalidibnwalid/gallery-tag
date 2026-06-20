import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

import { join } from 'path'

export default async function renameHandler(
  _: Electron.IpcMainInvokeEvent,
  folderPath: string,
  { tagId, newName }: { tagId: number; newName: string },
): Promise<TagModel> {
  if (!tagId || !newName?.trim()) throw new Error('Invalid tag id or name')

  try {
    if (!folderPath) {
      throw new Error('folderPath is required')
    }

    const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
    const database = db.getDatabase(dbPath)

    const tagRepo = new TagRepository(database)
    const updated = tagRepo.renameTag(tagId, newName.trim())
    if (!updated) throw new Error('Tag not found')

    return updated
  } catch (error) {
    console.error('Error renaming tag:', error)
    throw error
  }
}
