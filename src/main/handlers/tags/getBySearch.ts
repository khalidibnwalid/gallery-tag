import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

import { join } from 'path'

export default async function getBySearchHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  query: string,
): Promise<TagModel[]> {
  try {
    console.log(`Searching for tags: ${query} in folder: ${folderPath}`)

    const searchQuery = query.trim()

    if (!searchQuery) return []

    if (!folderPath) {
      throw new Error('folderPath is required')
    }

    const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
    const database = db.getDatabase(dbPath)

    // Search for tags
    const tagRepo = new TagRepository(database)
    const tags = tagRepo.getTagsBySearch(searchQuery)

    console.log(
      `Found ${tags.length} tags matching search query: "${searchQuery}"`,
    )

    return tags
  } catch (error) {
    console.error('Error searching for tags:', error)
    throw error
  }
}
