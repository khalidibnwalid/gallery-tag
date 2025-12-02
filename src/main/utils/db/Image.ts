import { FileInfo } from '@main/types/global'
import { ImageModel } from '@main/types/models.shared'
import Database from 'better-sqlite3'

export function insertImages(
  db: Database.Database,
  images: FileInfo[] | FileInfo,
): void {
  if (!Array.isArray(images)) {
    images = [images]
  }

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO images 
    (file_path, file_name, extension, size, modified_at, last_scanned)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `)

  const transaction = db.transaction((imageList: FileInfo[]) => {
    for (const image of imageList) {
      insertStmt.run(
        image.fullPath,
        image.fileName,
        image.extension,
        image.size,
        image.modifiedAt.toISOString(),
      )
    }
  })

  transaction(images)
}

export function getImagePathsFromDb(db: Database.Database): string[] {
  const stmt = db.prepare('SELECT file_path FROM images ORDER BY file_name')
  const rows = stmt.all() as { file_path: string }[]
  return rows.map(row => row.file_path)
}

export function getAllImagesFromDb(db: Database.Database): ImageModel[] {
  const stmt = db.prepare(`
    SELECT 
      id,
      file_path as filePath,
      file_name as fileName,
      extension,
      size,
      created_at as createdAt,
      modified_at as modifiedAt,
      last_scanned as lastScanned,
      thumbnail_path as thumbnailPath
    FROM images 
    ORDER BY file_name
  `)
  const rows = stmt.all() as ImageModel[]
  return rows
}

/**
 * returns paths that are not in the database from a set of current paths
 */
export function getPathsNotInImagesTable(
  db: Database.Database,
  currentPaths: string[],
): string[] {
  if (currentPaths.length === 0) {
    return []
  }

  db.prepare(
    `
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_check_paths (
      file_path TEXT PRIMARY KEY
    )
  `,
  ).run()

  db.prepare('DELETE FROM temp_check_paths').run()

  const insertStmt = db.prepare(
    'INSERT INTO temp_check_paths (file_path) VALUES (?)',
  )
  const transaction = db.transaction((paths: string[]) => {
    for (const path of paths) insertStmt.run(path)
  })

  transaction(currentPaths)

  // find paths not in the table
  const stmt = db.prepare(
    `
    SELECT tcp.file_path 
    FROM temp_check_paths tcp
    LEFT JOIN images i ON tcp.file_path = i.file_path
    WHERE i.file_path IS NULL
  `,
  )

  const rows = stmt.all() as { file_path: string }[]

  db.prepare('DROP TABLE temp_check_paths').run()

  return rows.map(row => row.file_path)
}

/**
 * diff currentPaths with database records and delete unmatched records
 */
export function deleteDiffImagesByPath(
  db: Database.Database,
  currentPaths: string[],
) {
  // temporary table for current paths
  db.prepare(
    `
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_current_paths (
      file_path TEXT PRIMARY KEY
    )
  `,
  ).run()

  // clear any existing data
  db.prepare('DELETE FROM temp_current_paths').run()

  // Insert current paths in batches for better performance
  const insertStmt = db.prepare(
    'INSERT INTO temp_current_paths (file_path) VALUES (?)',
  )
  const transaction = db.transaction((paths: string[]) => {
    for (const path of paths) insertStmt.run(path)
  })

  transaction(currentPaths)

  // Delete records not in current paths using JOIN
  const result = db
    .prepare(
      `
    DELETE FROM images 
    WHERE file_path NOT IN (
      SELECT file_path FROM temp_current_paths
    )
  `,
    )
    .run()

  db.prepare('DROP TABLE temp_current_paths').run()
  return result.changes
}

export function getImageStats(db: Database.Database): {
  totalImages: number
  totalSize: number
  lastScanTime: string | null
} {
  const countStmt = db.prepare(
    'SELECT COUNT(*) as count, SUM(size) as total_size FROM images',
  )
  const scanStmt = db.prepare(
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

export function updateThumbnailPath(
  db: Database.Database,
  imagePath: string,
  thumbnailPath: string,
): void {
  const stmt = db.prepare(`
    UPDATE images 
    SET thumbnail_path = ? 
    WHERE file_path = ?
  `)
  stmt.run(thumbnailPath, imagePath)
}

export function updateThumbnailPaths(
  db: Database.Database,
  updates: { imagePath: string; thumbnailPath: string }[],
): void {
  if (updates.length === 0) return

  const stmt = db.prepare(`
    UPDATE images 
    SET thumbnail_path = ? 
    WHERE file_path = ?
  `)

  const transaction = db.transaction((updateList: typeof updates) => {
    for (const update of updateList) {
      stmt.run(update.thumbnailPath, update.imagePath)
    }
  })

  transaction(updates)
}
