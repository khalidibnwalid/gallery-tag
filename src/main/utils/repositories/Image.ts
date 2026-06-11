import { FileInfo } from '@main/types/global'
import { SearchFilter } from '@main/types/api.shared'
import { ImageModel } from '@main/types/models.shared'
import Database from 'better-sqlite3'

export class ImageRepository {
  constructor(private db: Database.Database) {}

  insertImages(
    images: (FileInfo & { hash?: string })[] | (FileInfo & { hash?: string }),
  ): void {
    if (!Array.isArray(images)) {
      images = [images]
    }

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO images 
      (file_path, file_name, extension, size, modified_at, last_scanned, hash)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `)

    const transaction = this.db.transaction(
      (imageList: (FileInfo & { hash?: string })[]) => {
        for (const image of imageList) {
          insertStmt.run(
            image.fullPath,
            image.fileName,
            image.extension,
            image.size,
            image.modifiedAt.toISOString(),
            image.hash || null,
          )
        }
      },
    )

    transaction(images)
  }

  getImagePaths(): string[] {
    const stmt = this.db.prepare('SELECT file_path FROM images ORDER BY file_name')
    const rows = stmt.all() as { file_path: string }[]
    return rows.map(row => row.file_path)
  }

  getAllImages(): ImageModel[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        file_path as filePath,
        file_name as fileName,
        extension,
        size,
        created_at as createdAt,
        modified_at as modifiedAt,
        last_scanned as lastScanned,
        thumbnail_path as thumbnailPath,
        width,
        height,
        hash
      FROM images 
      ORDER BY file_name
    `)
    const rows = stmt.all() as ImageModel[]
    return rows
  }

  getAllImagesWithTags(): (ImageModel & { tags?: string })[] {
    const stmt = this.db.prepare(`
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
        i.width,
        i.height,
        i.hash,

        GROUP_CONCAT(t.name) as tags
      FROM images i
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
      GROUP BY i.id
      ORDER BY i.file_name
    `)
    const rows = stmt.all() as (ImageModel & { tags?: string })[]
    return rows
  }

  getAllImagesWithTagsPaginated(
    offset: number = 0,
    size: number = 50,
    filter?: SearchFilter,
  ): {
    data: (ImageModel & { tags?: string })[]
    total: number
  } {
    let whereClauses: string[] = []
    let params: any[] = []

    // Filter by text (filename or tags)
    if (filter?.text) {
      const searchPattern = `%${filter.text}%`
      whereClauses.push(`(
        i.file_name LIKE ? OR 
        t.name LIKE ?
      )`)
      params.push(searchPattern, searchPattern)
    }

    // Filter by folder path
    if (filter?.filterPath) {
      const folderPattern = `${filter.filterPath}%`
      whereClauses.push(`i.file_path LIKE ?`)
      params.push(folderPattern)
    }

    // Filter by tags
    if (filter?.tags && filter.tags.length > 0) {
      const placeholders = filter.tags.map(() => '?').join(',')
      whereClauses.push(`i.id IN (
        SELECT it.image_id
        FROM image_tags it
        JOIN tags t ON it.tag_id = t.id
        WHERE t.name IN (${placeholders})
      )`)
      params.push(...filter.tags)
    }

    // Filter by excluded tags
    if (filter?.excludedTags && filter.excludedTags.length > 0) {
      const placeholders = filter.excludedTags.map(() => '?').join(',')
      whereClauses.push(`i.id NOT IN (
        SELECT it.image_id
        FROM image_tags it
        JOIN tags t ON it.tag_id = t.id
        WHERE t.name IN (${placeholders})
      )`)
      params.push(...filter.excludedTags)
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // Count query
    const countStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT i.id) as total
      FROM images i
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
      ${whereSql}
    `)

    const countParams = [...params]
    const countResult = countStmt.get(...countParams) as { total: number }
    const total = countResult.total

    // Main query
    const stmt = this.db.prepare(`
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
        i.width,
        i.height,
        i.hash,

        GROUP_CONCAT(t.name) as tags
      FROM images i
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
      ${whereSql}
      GROUP BY i.id
      ORDER BY i.file_name
      LIMIT ? OFFSET ?
    `)

    const rows = stmt.all(...params, size, offset) as (ImageModel & {
      tags?: string
    })[]

    return {
      data: rows,
      total,
    }
  }

  getPathsNotInImagesTable(currentPaths: string[]): string[] {
    if (currentPaths.length === 0) {
      return []
    }

    this.db.prepare(
      `
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_check_paths (
        file_path TEXT PRIMARY KEY
      )
    `,
    ).run()

    this.db.prepare('DELETE FROM temp_check_paths').run()

    const insertStmt = this.db.prepare(
      'INSERT INTO temp_check_paths (file_path) VALUES (?)',
    )
    const transaction = this.db.transaction((paths: string[]) => {
      for (const path of paths) insertStmt.run(path)
    })

    transaction(currentPaths)

    // find paths not in the table
    const stmt = this.db.prepare(
      `
      SELECT tcp.file_path 
      FROM temp_check_paths tcp
      LEFT JOIN images i ON tcp.file_path = i.file_path
      WHERE i.file_path IS NULL
    `,
    )

    const rows = stmt.all() as { file_path: string }[]

    this.db.prepare('DROP TABLE temp_check_paths').run()

    return rows.map(row => row.file_path)
  }

  deleteDiffImagesByPath(currentPaths: string[]) {
    // temporary table for current paths
    this.db.prepare(
      `
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_current_paths (
        file_path TEXT PRIMARY KEY
      )
    `,
    ).run()

    // clear any existing data
    this.db.prepare('DELETE FROM temp_current_paths').run()

    // Insert current paths in batches for better performance
    const insertStmt = this.db.prepare(
      'INSERT INTO temp_current_paths (file_path) VALUES (?)',
    )
    const transaction = this.db.transaction((paths: string[]) => {
      for (const path of paths) insertStmt.run(path)
    })

    transaction(currentPaths)

    // Delete records not in current paths using JOIN
    const result = this.db
      .prepare(
        `
      DELETE FROM images 
      WHERE file_path NOT IN (
        SELECT file_path FROM temp_current_paths
      )
    `,
      )
      .run()

    this.db.prepare('DROP TABLE temp_current_paths').run()
    return result.changes
  }

  getImageStats(): {
    totalImages: number
    totalSize: number
    lastScanTime: string | null
  } {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count, SUM(size) as total_size FROM images',
    )
    const scanStmt = this.db.prepare(
      'SELECT MAX(last_scanned) as last_scan FROM images',
    )

    const countResult = countStmt.get() as {
      count: number
      total_size: number | null
    }
    const scanResult = scanStmt.get() as { last_scan: string | null }

    return {
      totalImages: countResult.count,
      totalSize: countResult.total_size || 0,
      lastScanTime: scanResult.last_scan,
    }
  }

  updateThumbnailPath(imagePath: string, thumbnailPath: string): void {
    const stmt = this.db.prepare(`
      UPDATE images 
      SET thumbnail_path = ? 
      WHERE file_path = ?
    `)
    stmt.run(thumbnailPath, imagePath)
  }

  updateThumbnailPaths(
    updates: {
      filePath: string
      thumbnailPath: string
      width?: number
      height?: number
    }[],
  ): void {
    if (updates.length === 0) return

    const stmt = this.db.prepare(`
      UPDATE images 
      SET thumbnail_path = ?, width = ?, height = ?
      WHERE file_path = ?
    `)

    const transaction = this.db.transaction((updateList: typeof updates) => {
      for (const update of updateList) {
        stmt.run(
          update.thumbnailPath,
          update.width || null,
          update.height || null,
          update.filePath,
        )
      }
    })

    transaction(updates)
  }

  getMissingImages(currentPaths: string[]): ImageModel[] {
    // Create temp table for current paths
    this.db.prepare(
      `
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_current_paths_check (
        file_path TEXT PRIMARY KEY
      )
    `,
    ).run()

    this.db.prepare('DELETE FROM temp_current_paths_check').run()

    const insertStmt = this.db.prepare(
      'INSERT INTO temp_current_paths_check (file_path) VALUES (?)',
    )
    const transaction = this.db.transaction((paths: string[]) => {
      for (const path of paths) insertStmt.run(path)
    })

    transaction(currentPaths)

    // Select images that are NOT in the temp table
    const stmt = this.db.prepare(`
      SELECT 
        id,
        file_path as filePath,
        file_name as fileName,
        extension,
        size,
        created_at as createdAt,
        modified_at as modifiedAt,
        last_scanned as lastScanned,
        thumbnail_path as thumbnailPath,
        width,
        height,
        hash
      FROM images 
      WHERE file_path NOT IN (SELECT file_path FROM temp_current_paths_check)
    `)

    const rows = stmt.all() as ImageModel[]

    this.db.prepare('DROP TABLE temp_current_paths_check').run()

    return rows
  }

  recoverImage(
    oldImageId: number,
    newFileInfo: FileInfo & { hash?: string },
  ): void {
    const stmt = this.db.prepare(`
      UPDATE images 
      SET 
        file_path = ?,
        file_name = ?,
        extension = ?,
        size = ?,
        modified_at = ?,
        last_scanned = CURRENT_TIMESTAMP,
        hash = COALESCE(?, hash)
      WHERE id = ?
    `)

    stmt.run(
      newFileInfo.fullPath,
      newFileInfo.fileName,
      newFileInfo.extension,
      newFileInfo.size,
      newFileInfo.modifiedAt.toISOString(),
      newFileInfo.hash || null,
      oldImageId,
    )
  }

  getImagesWithoutHash(): ImageModel[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        file_path as filePath,
        file_name as fileName,
        extension,
        size,
        created_at as createdAt,
        modified_at as modifiedAt,
        last_scanned as lastScanned,
        thumbnail_path as thumbnailPath,
        width,
        height,
        hash
      FROM images 
      WHERE hash IS NULL
    `)
    return stmt.all() as ImageModel[]
  }

  updateImageHash(imageId: number, hash: string): void {
    const stmt = this.db.prepare('UPDATE images SET hash = ? WHERE id = ?')
    stmt.run(hash, imageId)
  }
}
