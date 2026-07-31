import { SearchFilter } from '@main/types/api.shared'
import { FileInfo } from '@main/types/global'
import { ImageModel } from '@main/types/models.shared'
import Database from 'better-sqlite3'
import { hexToRgb, rgbToHsl } from '../colors'
import { clipService } from '@main/services/clip.service'
import { toRelativePath, toAbsolutePath } from '../pathUtils'

function makeMapImageRow(rootPath: string) {
  return function mapImageRow(row: any): any {
    if (!row) return row
    return {
      ...row,
      // Resolve stored relative paths to absolute for the caller
      filePath: row.filePath
        ? toAbsolutePath(rootPath, row.filePath)
        : row.filePath,
      thumbnailPath: row.thumbnailPath
        ? toAbsolutePath(rootPath, row.thumbnailPath)
        : row.thumbnailPath,
      dominantColors: row.dominantColors
        ? JSON.parse(row.dominantColors)
        : undefined,
      exif: row.exif ? JSON.parse(row.exif) : undefined,
    }
  }
}

export class ImageRepository {
  constructor(
    public readonly db: Database.Database,
    private rootPath: string,
  ) {}

  private get mapImageRow() {
    return makeMapImageRow(this.rootPath)
  }

  insertImages(
    images:
      | (FileInfo & {
          hash?: string
          dominantColors?: string[]
          isDuplicate?: number
          exif?: string | null
        })[]
      | (FileInfo & {
          hash?: string
          dominantColors?: string[]
          isDuplicate?: number
          exif?: string | null
        }),
  ): void {
    if (!Array.isArray(images)) {
      images = [images]
    }

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO images 
      (file_path, file_name, extension, size, modified_at, last_scanned, hash, dominant_colors, exif, is_duplicate, deleted_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, NULL)
    `)

    const transaction = this.db.transaction(
      (
        imageList: (FileInfo & {
          hash?: string
          dominantColors?: string[]
          isDuplicate?: number
          exif?: string | null
        })[],
      ) => {
        for (const image of imageList) {
          let isDup = image.isDuplicate !== undefined ? image.isDuplicate : 0
          if (image.hash && image.isDuplicate === undefined) {
            const hasActive = this.hasActiveImageWithHash(image.hash)
            isDup = hasActive ? 1 : 0
          }

          const result = insertStmt.run(
            toRelativePath(this.rootPath, image.fullPath),
            image.fileName,
            image.extension,
            image.size,
            image.modifiedAt.toISOString(),
            image.hash || null,
            image.dominantColors ? JSON.stringify(image.dominantColors) : null,
            image.exif || null,
            isDup,
          )

          if (image.dominantColors) {
            this.updateColorsInDb(
              Number(result.lastInsertRowid),
              image.dominantColors,
            )
          }
        }
      },
    )

    transaction(images)
  }

  getImagePaths(): string[] {
    const stmt = this.db.prepare(
      'SELECT file_path FROM images WHERE deleted_at IS NULL ORDER BY file_name',
    )
    const rows = stmt.all() as { file_path: string }[]
    return rows.map(row => row.file_path)
  }

  getAllImages(): { data: ImageModel[]; total: number } {
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
        hash,
        dominant_colors as dominantColors,
        exif,
        deleted_at as deletedAt,
        is_duplicate as isDuplicate
      FROM images 
      WHERE deleted_at IS NULL
      ORDER BY file_name
    `)
    const rows = stmt.all() as any[]
    const data = rows.map(this.mapImageRow)
    return { data, total: data.length }
  }

  getAllImagesWithTags(): {
    data: (ImageModel & { tags?: string })[]
    total: number
  } {
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
        i.dominant_colors as dominantColors,
        i.exif,
        i.deleted_at as deletedAt,
        i.is_duplicate as isDuplicate,

        GROUP_CONCAT(t.name) as tags
      FROM images i
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
      WHERE i.deleted_at IS NULL
      GROUP BY i.id
      ORDER BY i.file_name
    `)
    const rows = stmt.all() as any[]
    const data = rows.map(this.mapImageRow)
    return { data, total: data.length }
  }

  getAllImagesWithTagsPaginated(
    offset: number = 0,
    size: number = 50,
    filter?: SearchFilter,
    textEmbedding?: Float32Array,
    imageEmbedding?: Float32Array,
  ): {
    data: (ImageModel & { tags?: string })[]
    total: number
  } {
    let whereClauses: string[] = ['i.deleted_at IS NULL']
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

    // Filter by folder path (convert absolute filterPath to relative for DB comparison)
    if (filter?.filterPath) {
      const relFilter = toRelativePath(this.rootPath, filter.filterPath)
      // Root maps to '/' — match everything; subfolders match their relative prefix
      const folderPattern = relFilter === '/' ? '/%' : `${relFilter}/%`
      whereClauses.push(`i.file_path LIKE ?`)
      params.push(folderPattern)
    }

    // Filter by tags
    if (filter?.tags && filter.tags.length > 0) {
      const placeholders = filter.tags.map(() => '?').join(',')
      if (filter.tagMode === 'AND') {
        whereClauses.push(`i.id IN (
          SELECT it.image_id
          FROM image_tags it
          JOIN tags t ON it.tag_id = t.id
          WHERE t.name IN (${placeholders})
          GROUP BY it.image_id
          HAVING COUNT(DISTINCT t.name) = ?
        )`)
        params.push(...filter.tags, filter.tags.length)
      } else {
        whereClauses.push(`i.id IN (
          SELECT it.image_id
          FROM image_tags it
          JOIN tags t ON it.tag_id = t.id
          WHERE t.name IN (${placeholders})
        )`)
        params.push(...filter.tags)
      }
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

    // Filter by color
    let isColorFiltered = false
    let colorDistExpr = ''

    if (filter?.createdStart) {
      whereClauses.push(`date(i.created_at) >= date(?)`)
      params.push(filter.createdStart)
    }
    if (filter?.createdEnd) {
      whereClauses.push(`date(i.created_at) <= date(?)`)
      params.push(filter.createdEnd)
    }

    if (filter?.modifiedStart) {
      whereClauses.push(`date(i.modified_at) >= date(?)`)
      params.push(filter.modifiedStart)
    }
    if (filter?.modifiedEnd) {
      whereClauses.push(`date(i.modified_at) <= date(?)`)
      params.push(filter.modifiedEnd)
    }

    if (filter?.color) {
      const targetRgb = hexToRgb(filter.color)
      if (targetRgb) {
        const [r, g, b] = targetRgb
        colorDistExpr = `(ic.r - ${r}) * (ic.r - ${r}) + (ic.g - ${g}) * (ic.g - ${g}) + (ic.b - ${b}) * (ic.b - ${b})`
        whereClauses.push(`${colorDistExpr} <= ${75 * 75}`)
        isColorFiltered = true
      }
    }

    let cteSql = ''
    let cteParams: any[] = []

    if (textEmbedding && imageEmbedding) {
      const vecTable = clipService.getVectorTableName()
      cteSql = `
        WITH image_search AS (
          SELECT image_id, distance AS img_dist
          FROM ${vecTable}
          WHERE embedding MATCH ? AND k = ?
        ),
        search_results AS (
          SELECT 
            s.image_id,
            s.img_dist,
            vec_distance_cosine(v.embedding, ?) AS text_dist
          FROM image_search s
          INNER JOIN ${vecTable} v ON s.image_id = v.image_id
        )
      `
      cteParams.push(
        Buffer.from(
          imageEmbedding.buffer,
          imageEmbedding.byteOffset,
          imageEmbedding.byteLength,
        ),
        1000,
        Buffer.from(
          textEmbedding.buffer,
          textEmbedding.byteOffset,
          textEmbedding.byteLength,
        ),
      )

      const imgThreshold = clipService.getImageToImageThreshold(this.db)
      const textThreshold = clipService.getTextToImageThreshold(this.db)
      const maxImgDistance = 1.0 - imgThreshold
      const maxTextDistance = 1.0 - textThreshold

      whereClauses.push('v.img_dist <= ?')
      params.push(maxImgDistance)

      whereClauses.push('v.text_dist <= ?')
      params.push(maxTextDistance)
    } else if (textEmbedding) {
      const vecTable = clipService.getVectorTableName()
      cteSql = `
        WITH search_results AS (
          SELECT image_id, distance AS text_dist
          FROM ${vecTable}
          WHERE embedding MATCH ? AND k = ?
        )
      `
      cteParams.push(
        Buffer.from(
          textEmbedding.buffer,
          textEmbedding.byteOffset,
          textEmbedding.byteLength,
        ),
        1000,
      )

      const textThreshold = clipService.getTextToImageThreshold(this.db)
      const maxTextDistance = 1.0 - textThreshold

      whereClauses.push('v.text_dist <= ?')
      params.push(maxTextDistance)
    } else if (imageEmbedding) {
      const vecTable = clipService.getVectorTableName()
      cteSql = `
        WITH search_results AS (
          SELECT image_id, distance AS img_dist
          FROM ${vecTable}
          WHERE embedding MATCH ? AND k = ?
        )
      `
      cteParams.push(
        Buffer.from(
          imageEmbedding.buffer,
          imageEmbedding.byteOffset,
          imageEmbedding.byteLength,
        ),
        1000,
      )

      const imgThreshold = clipService.getImageToImageThreshold(this.db)
      const maxImgDistance = 1.0 - imgThreshold

      whereClauses.push('v.img_dist <= ?')
      params.push(maxImgDistance)
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    let joinClause = isColorFiltered
      ? 'INNER JOIN image_colors ic ON i.id = ic.image_id'
      : ''
    const hasEmbedding = !!(textEmbedding || imageEmbedding)
    if (hasEmbedding) {
      joinClause += ` INNER JOIN search_results v ON i.id = v.image_id`
    }

    // Count query
    const countStmt = this.db.prepare(`
      ${cteSql}
      SELECT COUNT(DISTINCT i.id) as total
      FROM images i
      ${joinClause}
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
      ${whereSql}
    `)

    const countResult = countStmt.get(...cteParams, ...params) as {
      total: number
    }
    const total = countResult?.total || 0

    // Main query
    const selectColorDist = isColorFiltered
      ? `, MIN(${colorDistExpr}) as color_dist`
      : ''

    let orderBy = 'i.file_name ASC'
    if (filter?.sortBy) {
      const order = filter.sortOrder === 'desc' ? 'DESC' : 'ASC'
      if (filter.sortBy === 'createdAt') {
        orderBy = `i.created_at ${order}`
      } else if (filter.sortBy === 'modifiedAt') {
        orderBy = `i.modified_at ${order}`
      } else if (filter.sortBy === 'fileName') {
        orderBy = `i.file_name ${order}`
      }
    }

    if (textEmbedding && imageEmbedding) {
      orderBy = 'v.text_dist ASC'
    } else if (textEmbedding) {
      orderBy = 'v.text_dist ASC'
    } else if (imageEmbedding) {
      orderBy = 'v.img_dist ASC'
    } else if (isColorFiltered) {
      orderBy = 'color_dist ASC'
    }

    let selectDistance = ''
    if (textEmbedding && imageEmbedding) {
      selectDistance = ', v.text_dist as ai_distance'
    } else if (textEmbedding) {
      selectDistance = ', v.text_dist as ai_distance'
    } else if (imageEmbedding) {
      selectDistance = ', v.img_dist as ai_distance'
    }

    const stmt = this.db.prepare(`
      ${cteSql}
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
        i.dominant_colors as dominantColors,
        i.exif,
        i.deleted_at as deletedAt,
        i.is_duplicate as isDuplicate
        ${selectColorDist}
        ${selectDistance},
        GROUP_CONCAT(t.name) as tags
      FROM images i
      ${joinClause}
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
      ${whereSql}
      GROUP BY i.id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `)

    const rows = stmt.all(...cteParams, ...params, size, offset) as any[]
    const data = rows.map(this.mapImageRow)

    return {
      data,
      total,
    }
  }

  getPathsNotInImagesTable(currentPaths: string[]): string[] {
    if (currentPaths.length === 0) {
      return []
    }

    // Convert absolute paths to relative for DB comparison
    const relativePaths = currentPaths.map(p =>
      toRelativePath(this.rootPath, p),
    )

    this.db
      .prepare(
        `
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_check_paths (
        file_path TEXT PRIMARY KEY
      )
    `,
      )
      .run()

    this.db.prepare('DELETE FROM temp_check_paths').run()

    const insertStmt = this.db.prepare(
      'INSERT INTO temp_check_paths (file_path) VALUES (?)',
    )
    const transaction = this.db.transaction((paths: string[]) => {
      for (const path of paths) insertStmt.run(path)
    })

    transaction(relativePaths)

    // find relative paths not in the images table (or soft-deleted)
    const stmt = this.db.prepare(
      `
      SELECT tcp.file_path 
      FROM temp_check_paths tcp
      LEFT JOIN images i ON tcp.file_path = i.file_path
      WHERE i.file_path IS NULL OR i.deleted_at IS NOT NULL
    `,
    )

    const rows = stmt.all() as { file_path: string }[]

    this.db.prepare('DROP TABLE temp_check_paths').run()

    // Return absolute paths so callers can work with the filesystem
    return rows.map(row => toAbsolutePath(this.rootPath, row.file_path))
  }

  getImagesMissingFromPaths(
    currentPaths: string[],
  ): { id: number; filePath: string }[] {
    // Convert absolute paths to relative for DB comparison
    const relativePaths = currentPaths.map(p =>
      toRelativePath(this.rootPath, p),
    )

    // temporary table for current paths
    this.db
      .prepare(
        `
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_current_paths (
        file_path TEXT PRIMARY KEY
      )
    `,
      )
      .run()

    // clear any existing data
    this.db.prepare('DELETE FROM temp_current_paths').run()

    // Insert relative paths
    const insertStmt = this.db.prepare(
      'INSERT INTO temp_current_paths (file_path) VALUES (?)',
    )
    const transaction = this.db.transaction((paths: string[]) => {
      for (const path of paths) insertStmt.run(path)
    })
    transaction(relativePaths)

    // Select active images not in current relative paths
    const selectStmt = this.db.prepare(`
      SELECT id, file_path as filePath FROM images
      WHERE deleted_at IS NULL
        AND file_path NOT IN (
          SELECT file_path FROM temp_current_paths
        )
    `)
    const rawResult = selectStmt.all() as { id: number; filePath: string }[]

    this.db.prepare('DROP TABLE temp_current_paths').run()
    // Resolve relative paths back to absolute for the caller
    return rawResult.map(row => ({
      id: row.id,
      filePath: toAbsolutePath(this.rootPath, row.filePath),
    }))
  }

  markMissingImagesAsDeleted(currentPaths: string[]) {
    // Convert absolute paths to relative for DB comparison
    const relativePaths = currentPaths.map(p =>
      toRelativePath(this.rootPath, p),
    )

    // temporary table for current paths
    this.db
      .prepare(
        `
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_current_paths (
        file_path TEXT PRIMARY KEY
      )
    `,
      )
      .run()

    // clear any existing data
    this.db.prepare('DELETE FROM temp_current_paths').run()

    // Insert relative paths
    const insertStmt = this.db.prepare(
      'INSERT INTO temp_current_paths (file_path) VALUES (?)',
    )
    const transaction = this.db.transaction((paths: string[]) => {
      for (const path of paths) insertStmt.run(path)
    })

    transaction(relativePaths)

    // Mark missing images as deleted
    const result = this.db
      .prepare(
        `
      UPDATE images 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL
        AND file_path NOT IN (
          SELECT file_path FROM temp_current_paths
        )
    `,
      )
      .run()

    this.db.prepare('DROP TABLE temp_current_paths').run()
    return result.changes
  }

  purgeExpiredDeletedImages(): number {
    // Find image IDs to purge (deleted more than 30 days ago)
    const stmt = this.db.prepare(`
      SELECT id FROM images
      WHERE deleted_at IS NOT NULL
        AND deleted_at < datetime('now', '-30 days')
    `)
    const expired = stmt.all() as { id: number }[]
    if (expired.length === 0) return 0

    const ids = expired.map(row => row.id)

    // Delete from images and its related data inside a transaction
    const runDelete = this.db.transaction(() => {
      const deleteColors = this.db.prepare(
        'DELETE FROM image_colors WHERE image_id = ?',
      )
      const deleteTags = this.db.prepare(
        'DELETE FROM image_tags WHERE image_id = ?',
      )
      const vecTables = this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE 'CREATE VIRTUAL TABLE%' AND (name = 'vec_images' OR name LIKE 'vec_images_%')",
        )
        .all() as { name: string }[]
      const deleteVecStmts = vecTables.map(t =>
        this.db.prepare(`DELETE FROM ${t.name} WHERE image_id = ?`),
      )
      const deleteImage = this.db.prepare('DELETE FROM images WHERE id = ?')

      for (const id of ids) {
        deleteColors.run(id)
        deleteTags.run(id)
        for (const stmt of deleteVecStmts) {
          stmt.run(BigInt(id))
        }
        deleteImage.run(id)
      }
    })

    runDelete()
    return ids.length
  }

  hasActiveImageWithHash(hash: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM images
      WHERE hash = ? AND deleted_at IS NULL
      LIMIT 1
    `)
    return !!stmt.get(hash)
  }

  /**
   * Returns soft-deleted image records whose file_path is in the given list.
   * Used to recover images that were soft-deleted but whose file still exists
   * at the same path (e.g. a rescan after an app restart).
   */
  getSoftDeletedImagesAtPaths(paths: string[]): ImageModel[] {
    if (paths.length === 0) return []

    // Convert absolute paths to relative for DB comparison
    const relativePaths = paths.map(p => toRelativePath(this.rootPath, p))
    const placeholders = relativePaths.map(() => '?').join(',')
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
        hash,
        dominant_colors as dominantColors,
        exif,
        deleted_at as deletedAt,
        is_duplicate as isDuplicate
      FROM images
      WHERE deleted_at IS NOT NULL
        AND file_path IN (${placeholders})
    `)
    const rows = stmt.all(...relativePaths) as any[]
    return rows.map(this.mapImageRow)
  }

  getImageStats(): {
    totalImages: number
    totalSize: number
    lastScanTime: string | null
  } {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count, SUM(size) as total_size FROM images WHERE deleted_at IS NULL',
    )
    const scanStmt = this.db.prepare(
      'SELECT MAX(last_scanned) as last_scan FROM images WHERE deleted_at IS NULL',
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
    stmt.run(
      toRelativePath(this.rootPath, thumbnailPath),
      toRelativePath(this.rootPath, imagePath),
    )
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
          toRelativePath(this.rootPath, update.thumbnailPath),
          update.width || null,
          update.height || null,
          toRelativePath(this.rootPath, update.filePath),
        )
      }
    })

    transaction(updates)
  }

  getMissingImages(): ImageModel[] {
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
        hash,
        dominant_colors as dominantColors
      FROM images 
      WHERE deleted_at IS NOT NULL
    `)

    const rows = stmt.all() as any[]
    return rows.map(this.mapImageRow)
  }

  recoverImage(
    oldImageId: number,
    newFileInfo: FileInfo & { hash?: string; dominantColors?: string[] },
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
        hash = COALESCE(?, hash),
        dominant_colors = COALESCE(?, dominant_colors),
        deleted_at = NULL,
        is_duplicate = 0
      WHERE id = ?
    `)

    stmt.run(
      toRelativePath(this.rootPath, newFileInfo.fullPath),
      newFileInfo.fileName,
      newFileInfo.extension,
      newFileInfo.size,
      newFileInfo.modifiedAt.toISOString(),
      newFileInfo.hash || null,
      newFileInfo.dominantColors
        ? JSON.stringify(newFileInfo.dominantColors)
        : null,
      oldImageId,
    )

    if (newFileInfo.dominantColors) {
      this.updateColorsInDb(oldImageId, newFileInfo.dominantColors)
    }
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
        hash,
        dominant_colors as dominantColors
      FROM images 
      WHERE hash IS NULL AND deleted_at IS NULL
    `)
    const rows = stmt.all() as any[]
    return rows.map(this.mapImageRow)
  }

  updateImageHash(imageId: number, hash: string): void {
    const stmt = this.db.prepare('UPDATE images SET hash = ? WHERE id = ?')
    stmt.run(hash, imageId)
  }

  getImagesWithoutDominantColors(): ImageModel[] {
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
        hash,
        dominant_colors as dominantColors
      FROM images 
      WHERE (dominant_colors IS NULL OR id NOT IN (SELECT DISTINCT image_id FROM image_colors)) AND deleted_at IS NULL
    `)
    const rows = stmt.all() as any[]
    return rows.map(this.mapImageRow)
  }

  private updateColorsInDb(imageId: number, colors: string[]): void {
    this.db.prepare('DELETE FROM image_colors WHERE image_id = ?').run(imageId)
    if (!colors || colors.length === 0) return

    const insertColorStmt = this.db.prepare(`
      INSERT INTO image_colors (image_id, r, g, b, h, s, l, rank)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    colors.forEach((color, index) => {
      const rgb = hexToRgb(color)
      if (rgb) {
        const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2])
        insertColorStmt.run(
          imageId,
          rgb[0],
          rgb[1],
          rgb[2],
          hsl.h,
          hsl.s,
          hsl.l,
          index + 1,
        )
      }
    })
  }

  updateImageDominantColors(imageId: number, colors: string[]): void {
    const stmt = this.db.prepare(
      'UPDATE images SET dominant_colors = ? WHERE id = ?',
    )
    stmt.run(JSON.stringify(colors), imageId)
    this.updateColorsInDb(imageId, colors)
  }

  getImagesWithoutEmbeddings(): ImageModel[] {
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
        hash,
        dominant_colors as dominantColors
      FROM images 
      WHERE deleted_at IS NULL AND id NOT IN (SELECT image_id FROM ${clipService.getVectorTableName()})
    `)
    const rows = stmt.all() as any[]
    return rows.map(this.mapImageRow)
  }

  insertImageEmbedding(imageId: number, embedding: Float32Array): void {
    const vecTable = clipService.getVectorTableName()
    const deleteStmt = this.db.prepare(
      `DELETE FROM ${vecTable} WHERE image_id = ?`,
    )
    const insertStmt = this.db.prepare(
      `INSERT INTO ${vecTable} (image_id, embedding) VALUES (?, ?)`,
    )

    const runTransaction = this.db.transaction(
      (id: number, emb: Float32Array) => {
        deleteStmt.run(BigInt(id))
        insertStmt.run(
          BigInt(id),
          Buffer.from(emb.buffer, emb.byteOffset, emb.byteLength),
        )
      },
    )

    runTransaction(imageId, embedding)
  }

  clearAllThumbnailPaths(): number {
    const result = this.db
      .prepare(
        'UPDATE images SET thumbnail_path = NULL, width = NULL, height = NULL WHERE deleted_at IS NULL',
      )
      .run()
    return result.changes
  }

  clearAllEmbeddings(): number {
    const vecTable = clipService.getVectorTableName()
    const result = this.db.prepare(`DELETE FROM ${vecTable}`).run()
    return result.changes
  }

  getImageById(id: number): ImageModel | undefined {
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
        hash,
        dominant_colors as dominantColors,
        exif,
        deleted_at as deletedAt,
        is_duplicate as isDuplicate
      FROM images 
      WHERE id = ?
    `)
    const row = stmt.get(id)
    return row ? this.mapImageRow(row) : undefined
  }

  getImagesByIds(ids: number[]): ImageModel[] {
    if (ids.length === 0) return []
    const placeholders = ids.map(() => '?').join(',')
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
        hash,
        dominant_colors as dominantColors,
        exif,
        deleted_at as deletedAt,
        is_duplicate as isDuplicate
      FROM images 
      WHERE id IN (${placeholders})
    `)
    const rows = stmt.all(...ids)
    return rows.map(row => this.mapImageRow(row))
  }

  updateImagePathAndName(
    id: number,
    newFilePath: string,
    newFileName: string,
  ): void {
    const stmt = this.db.prepare(`
      UPDATE images 
      SET file_path = ?, file_name = ?
      WHERE id = ?
    `)
    stmt.run(toRelativePath(this.rootPath, newFilePath), newFileName, id)
  }

  softDeleteImages(ids: number[]): void {
    const stmt = this.db.prepare(`
      UPDATE images 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `)
    const transaction = this.db.transaction((idList: number[]) => {
      for (const id of idList) {
        stmt.run(id)
      }
    })
    transaction(ids)
  }

  getAllActiveImages(): ImageModel[] {
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
        hash,
        dominant_colors as dominantColors,
        deleted_at as deletedAt,
        is_duplicate as isDuplicate
      FROM images
      WHERE deleted_at IS NULL
      ORDER BY file_name
    `)
    const rows = stmt.all() as any[]
    return rows.map(this.mapImageRow)
  }

  getImagesWithoutExif(): ImageModel[] {
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
        hash,
        dominant_colors as dominantColors
      FROM images 
      WHERE exif IS NULL AND deleted_at IS NULL
    `)
    const rows = stmt.all() as any[]
    return rows.map(this.mapImageRow)
  }

  updateImageExif(imageId: number, exif: string | null): void {
    const stmt = this.db.prepare('UPDATE images SET exif = ? WHERE id = ?')
    stmt.run(exif, imageId)
  }

  getImageIds(
    filter?: SearchFilter,
    textEmbedding?: Float32Array,
    imageEmbedding?: Float32Array,
  ): number[] {
    let whereClauses: string[] = ['i.deleted_at IS NULL']
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

    // Filter by folder path (convert absolute filterPath to relative for DB comparison)
    if (filter?.filterPath) {
      const relFilter = toRelativePath(this.rootPath, filter.filterPath)
      // Root maps to '/' — match everything; subfolders match their relative prefix
      const folderPattern = relFilter === '/' ? '/%' : `${relFilter}/%`
      whereClauses.push(`i.file_path LIKE ?`)
      params.push(folderPattern)
    }

    // Filter by tags
    if (filter?.tags && filter.tags.length > 0) {
      const placeholders = filter.tags.map(() => '?').join(',')
      if (filter.tagMode === 'AND') {
        whereClauses.push(`i.id IN (
          SELECT it.image_id
          FROM image_tags it
          JOIN tags t ON it.tag_id = t.id
          WHERE t.name IN (${placeholders})
          GROUP BY it.image_id
          HAVING COUNT(DISTINCT t.name) = ?
        )`)
        params.push(...filter.tags, filter.tags.length)
      } else {
        whereClauses.push(`i.id IN (
          SELECT it.image_id
          FROM image_tags it
          JOIN tags t ON it.tag_id = t.id
          WHERE t.name IN (${placeholders})
        )`)
        params.push(...filter.tags)
      }
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

    // Filter by color
    let isColorFiltered = false
    let colorDistExpr = ''

    if (filter?.createdStart) {
      whereClauses.push(`date(i.created_at) >= date(?)`)
      params.push(filter.createdStart)
    }
    if (filter?.createdEnd) {
      whereClauses.push(`date(i.created_at) <= date(?)`)
      params.push(filter.createdEnd)
    }

    if (filter?.modifiedStart) {
      whereClauses.push(`date(i.modified_at) >= date(?)`)
      params.push(filter.modifiedStart)
    }
    if (filter?.modifiedEnd) {
      whereClauses.push(`date(i.modified_at) <= date(?)`)
      params.push(filter.modifiedEnd)
    }

    if (filter?.color) {
      const targetRgb = hexToRgb(filter.color)
      if (targetRgb) {
        const [r, g, b] = targetRgb
        colorDistExpr = `(ic.r - ${r}) * (ic.r - ${r}) + (ic.g - ${g}) * (ic.g - ${g}) + (ic.b - ${b}) * (ic.b - ${b})`
        whereClauses.push(`${colorDistExpr} <= ${75 * 75}`)
        isColorFiltered = true
      }
    }

    let cteSql = ''
    let cteParams: any[] = []

    if (textEmbedding && imageEmbedding) {
      const vecTable = clipService.getVectorTableName()
      cteSql = `
        WITH image_search AS (
          SELECT image_id, distance AS img_dist
          FROM ${vecTable}
          WHERE embedding MATCH ? AND k = ?
        ),
        search_results AS (
          SELECT 
            s.image_id,
            s.img_dist,
            vec_distance_cosine(v.embedding, ?) AS text_dist
          FROM image_search s
          INNER JOIN ${vecTable} v ON s.image_id = v.image_id
        )
      `
      cteParams.push(
        Buffer.from(
          imageEmbedding.buffer,
          imageEmbedding.byteOffset,
          imageEmbedding.byteLength,
        ),
        1000,
        Buffer.from(
          textEmbedding.buffer,
          textEmbedding.byteOffset,
          textEmbedding.byteLength,
        ),
      )

      const imgThreshold = clipService.getImageToImageThreshold(this.db)
      const textThreshold = clipService.getTextToImageThreshold(this.db)
      const maxImgDistance = 1.0 - imgThreshold
      const maxTextDistance = 1.0 - textThreshold

      whereClauses.push('v.img_dist <= ?')
      params.push(maxImgDistance)

      whereClauses.push('v.text_dist <= ?')
      params.push(maxTextDistance)
    } else if (textEmbedding) {
      const vecTable = clipService.getVectorTableName()
      cteSql = `
        WITH search_results AS (
          SELECT image_id, distance AS text_dist
          FROM ${vecTable}
          WHERE embedding MATCH ? AND k = ?
        )
      `
      cteParams.push(
        Buffer.from(
          textEmbedding.buffer,
          textEmbedding.byteOffset,
          textEmbedding.byteLength,
        ),
        1000,
      )

      const textThreshold = clipService.getTextToImageThreshold(this.db)
      const maxTextDistance = 1.0 - textThreshold

      whereClauses.push('v.text_dist <= ?')
      params.push(maxTextDistance)
    } else if (imageEmbedding) {
      const vecTable = clipService.getVectorTableName()
      cteSql = `
        WITH search_results AS (
          SELECT image_id, distance AS img_dist
          FROM ${vecTable}
          WHERE embedding MATCH ? AND k = ?
        )
      `
      cteParams.push(
        Buffer.from(
          imageEmbedding.buffer,
          imageEmbedding.byteOffset,
          imageEmbedding.byteLength,
        ),
        1000,
      )

      const imgThreshold = clipService.getImageToImageThreshold(this.db)
      const maxImgDistance = 1.0 - imgThreshold

      whereClauses.push('v.img_dist <= ?')
      params.push(maxImgDistance)
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    let joinClause = isColorFiltered
      ? 'INNER JOIN image_colors ic ON i.id = ic.image_id'
      : ''
    const hasEmbedding = !!(textEmbedding || imageEmbedding)
    if (hasEmbedding) {
      joinClause += ` INNER JOIN search_results v ON i.id = v.image_id`
    }

    const stmt = this.db.prepare(`
      ${cteSql}
      SELECT DISTINCT i.id
      FROM images i
      ${joinClause}
      LEFT JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN tags t ON it.tag_id = t.id
      ${whereSql}
    `)

    const rows = stmt.all(...cteParams, ...params) as { id: number }[]
    return rows.map(r => r.id)
  }
}
