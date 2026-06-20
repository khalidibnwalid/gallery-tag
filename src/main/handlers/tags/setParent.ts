import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

import { join } from 'path'

export default async function setParentHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  {
    tagId,
    parentId,
  }: {
    tagId: number
    parentId: number | null
  },
): Promise<TagModel | undefined> {
  try {
    console.log(`Setting parent of tag ${tagId} to ${parentId} for folder: ${folderPath}`)
    if (!folderPath) {
      throw new Error('folderPath is required')
    }

    const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
    const database = db.getDatabase(dbPath)

    const tagRepo = new TagRepository(database)
    const updatedTag = tagRepo.setParent(tagId, parentId)
    return updatedTag
  } catch (error) {
    console.error('Error setting tag parent:', error)
    throw error
  }
}
