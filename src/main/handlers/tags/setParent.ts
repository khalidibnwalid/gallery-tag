import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

export default async function setParentHandler(
  _event: Electron.IpcMainInvokeEvent,
  {
    tagId,
    parentId,
  }: {
    tagId: number
    parentId: number | null
  },
): Promise<TagModel | undefined> {
  try {
    console.log(`Setting parent of tag ${tagId} to ${parentId}`)
    const database = db.getFirstDatabase()
    if (!database) {
      throw new Error(
        'No active database connection found. Please load a folder first.',
      )
    }

    const tagRepo = new TagRepository(database)
    const updatedTag = tagRepo.setParent(tagId, parentId)
    return updatedTag
  } catch (error) {
    console.error('Error setting tag parent:', error)
    throw error
  }
}
