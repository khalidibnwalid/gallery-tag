import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/db/db'
import { getAllTags } from '@main/utils/db/tag'

export default async function getAllHandler(
  _event: Electron.IpcMainInvokeEvent,
): Promise<TagModel[]> {
  try {
    console.log('Getting all tags')

    // Get database connection - use first available database connection
    const connectedPaths = db.getConnectedPaths()
    if (connectedPaths.length === 0) {
      throw new Error(
        'No active database connection found. Please load a folder first.',
      )
    }

    const database = db.getDatabase(connectedPaths[0])

    // Get all tags
    const tags = getAllTags(database)

    console.log(`Found ${tags.length} total tags`)
    return tags
  } catch (error) {
    console.error('Error getting all tags:', error)
    throw error
  }
}
