import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

export default async function getBySearchHandler(
  _event: Electron.IpcMainInvokeEvent,
  query: string,
): Promise<TagModel[]> {
  try {
    console.log(`Searching for tags: ${query}`)

    const searchQuery = query.trim()

    if (!searchQuery) return []

    const database = db.getFirstDatabase()
    if (!database) {
      throw new Error(
        'No active database connection found. Please load a folder first.',
      )
    }

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
