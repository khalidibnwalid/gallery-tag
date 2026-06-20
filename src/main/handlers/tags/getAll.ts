import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'
import { join } from 'path'

export default async function getAllHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<TagModel[]> {
  try {
    console.log(`Getting all tags for folder: ${folderPath}`)

    if (!folderPath) {
      throw new Error('folderPath is required')
    }

    const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
    const database = db.getDatabase(dbPath)

    // Get all tags
    const tagRepo = new TagRepository(database)
    const tags = tagRepo.getAllTags()

    console.log(`Found ${tags.length} total tags`)
    return tags
  } catch (error) {
    console.error('Error getting all tags:', error)
    throw error
  }
}
