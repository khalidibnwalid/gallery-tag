import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/db/db'
import { getTagsBySearch } from '@main/utils/db/tag'

export default async function getTagsBySearchHandler(
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
    const tags = getTagsBySearch(database, searchQuery)

    console.log(
      `Found ${tags.length} tags matching search query: "${searchQuery}"`,
    )

    return tags
  } catch (error) {
    console.error('Error searching for tags:', error)
    throw error
  }
}
