import { ImageModel, PaginatedResult } from '@main/types/models.shared'
import { db } from '@main/utils/db/db'
import { searchImagesPaginated } from '@main/utils/db/Image'

async function getBySearchBase(
  _event: Electron.IpcMainInvokeEvent,
  query: string,
  offset?: number,
  size?: number,
): Promise<
  | PaginatedResult<ImageModel & { tags?: string }>
  | (ImageModel & { tags?: string })[]
> {
  try {
    const searchQuery = query.trim()
    const isPaginated = offset !== undefined && size !== undefined

    console.log(
      isPaginated
        ? `Searching for: "${searchQuery}" with pagination - offset: ${offset}, size: ${size}`
        : `Searching for: "${searchQuery}"`,
    )

    if (!searchQuery) {
      if (isPaginated) {
        return {
          data: [],
          pagination: {
            offset: offset!,
            size: size!,
            total: 0,
            hasMore: false,
          },
        }
      } else {
        return []
      }
    }

    if (isPaginated) {
      const { data: results, total } = searchItemsPaginated(
        searchQuery,
        offset!,
        size!,
      )
      const hasMore = offset! + size! < total

      console.log(
        `Found ${results.length} images matching search query: "${searchQuery}" (${offset}-${offset! + size! - 1} of ${total})`,
      )

      return {
        data: results,
        pagination: {
          offset: offset!,
          size: size!,
          total,
          hasMore,
        },
      }
    } else {
      const results = searchItems(searchQuery)
      console.log(
        `Found ${results.length} images matching search query: "${searchQuery}"`,
      )
      return results
    }
  } catch (error) {
    console.error('Error searching for items:', error)

    if (offset !== undefined && size !== undefined) {
      return {
        data: [],
        pagination: {
          offset,
          size,
          total: 0,
          hasMore: false,
        },
      }
    } else {
      throw error
    }
  }
}

export default async function getBySearchHandler(
  event: Electron.IpcMainInvokeEvent,
  query: string,
): Promise<(ImageModel & { tags?: string })[]> {
  return (await getBySearchBase(event, query)) as (ImageModel & {
    tags?: string
  })[]
}

export async function getBySearchPaginatedHandler(
  event: Electron.IpcMainInvokeEvent,
  query: string,
  offset: number = 0,
  size: number = 50,
): Promise<PaginatedResult<ImageModel & { tags?: string }>> {
  return (await getBySearchBase(event, query, offset, size)) as PaginatedResult<
    ImageModel & { tags?: string }
  >
}

function searchItems(query: string): (ImageModel & { tags?: string })[] {
  const database = db.getFirstDatabase()
  if (!database) return []

  const stmt = database.prepare(`
      SELECT
        i.id,
        i.file_path as filePath,
        i.file_name as fileName,
        i.extension,
        i.size,
        i.created_at as createdAt,
        i.modified_at as modifiedAt,
        i.last_scanned as lastScanned,
        i.thumbnail_path as thumbnailPath,

        GROUP_CONCAT(t.name) as tags
      FROM images i
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
      WHERE 
        i.file_name LIKE ? OR 
        i.file_path LIKE ? OR
        t.name LIKE ?
      GROUP BY i.id
      ORDER BY i.file_name
    `)

  const searchPattern = `%${query}%`
  const results = stmt.all(
    searchPattern,
    searchPattern,
    searchPattern,
  ) as (ImageModel & { tags?: string })[]
  return results
}

function searchItemsPaginated(
  query: string,
  offset: number,
  size: number,
): {
  data: (ImageModel & { tags?: string })[]
  total: number
} {
  const database = db.getFirstDatabase()
  if (!database) return { data: [], total: 0 }

  return searchImagesPaginated(database, query, offset, size)
}
