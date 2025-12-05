import { ImageModel } from '@main/types/models.shared'
import { db } from '@main/utils/db/db'

export default async function getItemsBySearchHandler(
  _event: Electron.IpcMainInvokeEvent,
  query: string,
): Promise<ImageModel[]> {
  try {
    console.log(`Searching for: ${query}`)

    const searchQuery = query.trim()

    if (!searchQuery) return []

    const results = searchItems(searchQuery)
    console.log(
      `Found ${results.length} images matching search query: "${searchQuery}"`,
    )
    return results
  } catch (error) {
    console.error('Error searching for items:', error)
    throw error
  }
}

function searchItems(query: string): ImageModel[] {
  const database = db.getFirstDatabase()
  if (!database) return []

  // todo add tag table join
  const stmt = database.prepare(`
      SELECT DISTINCT
        i.id,
        i.file_path as filePath,
        i.file_name as fileName,
        i.extension,
        i.size,
        i.created_at as createdAt,
        i.modified_at as modifiedAt,
        i.last_scanned as lastScanned,
        i.thumbnail_path as thumbnailPath
      FROM images i
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
      WHERE 
        i.file_name LIKE ? OR 
        i.file_path LIKE ? OR
        t.name LIKE ?
      ORDER BY i.file_name
    `)

  const searchPattern = `%${query}%`
  const results = stmt.all(searchPattern, searchPattern, searchPattern) as ImageModel[]
  return results
}
