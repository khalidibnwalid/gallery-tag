import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

export default async function renameHandler(
  _: Electron.IpcMainInvokeEvent,
  { tagId, newName }: { tagId: number; newName: string },
): Promise<TagModel> {
  if (!tagId || !newName?.trim()) throw new Error('Invalid tag id or name')

  try {
    const database = db.getFirstDatabase()
    if (!database)
      throw new Error(
        'No active database connection found. Please load a folder first.',
      )

    const tagRepo = new TagRepository(database)
    const updated = tagRepo.renameTag(tagId, newName.trim())
    if (!updated) throw new Error('Tag not found')

    return updated
  } catch (error) {
    console.error('Error renaming tag:', error)
    throw error
  }
}
