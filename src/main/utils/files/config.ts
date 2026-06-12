import Database from 'better-sqlite3'
import { constants } from 'fs'
import { access, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { db } from '../repositories/db'
import { toRelativePath } from '../pathUtils'

export const CONFIG_DIR = '.gallery'
export const CONFIG_DB_FILE = 'gallery.sqlite'
export const THUMBNAILS_DIR = join(CONFIG_DIR, 'thumbnails')

interface ConfigPaths {
  configDir: string
  dbPath: string
}

/**
 * get or create config folder and database
 */
export async function getAndInitConfig(baseDir: string): Promise<{
  configDir: string
  dbPath: string
  db: Database.Database
}> {
  const { configDir, dbPath } = getConfigPaths(baseDir)

  if (!(await configExists(configDir))) await createConfigFolder(configDir)
  if (!(await thumbnailsFolderExists(join(baseDir, THUMBNAILS_DIR))))
    await createConfigFolder(join(baseDir, THUMBNAILS_DIR))
  const database = db.getDatabase(dbPath)

  // One-time migration: convert any legacy absolute paths to root-relative
  migrateAbsolutePathsToRelative(database, baseDir)

  return { configDir, dbPath, db: database }
}

function getConfigPaths(baseDir: string): ConfigPaths {
  const configDir = join(baseDir, CONFIG_DIR)
  const dbPath = join(configDir, CONFIG_DB_FILE)

  return { configDir, dbPath }
}

/**
 * Derive the root gallery folder path from a DB file path.
 * DB paths follow the pattern: <rootPath>/.gallery/gallery.sqlite
 */
export function getRootPath(dbPath: string): string {
  // Remove the trailing "/.gallery/gallery.sqlite"
  return dbPath.replace(/[\\/]\.gallery[\\/][^\\/]+\.(?:sqlite|db)$/, '')
}

async function configExists(configDir: string): Promise<boolean> {
  try {
    await access(configDir, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function thumbnailsFolderExists(thumbnailsDir: string): Promise<boolean> {
  try {
    await access(thumbnailsDir, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function createConfigFolder(configDir: string): Promise<void> {
  try {
    await mkdir(configDir, { recursive: true })
    console.log(`Created config folder: ${configDir}`)
    
    // Create .gitignore to ignore all contents of the config folder
    const gitignorePath = join(configDir, '.gitignore')
    await writeFile(gitignorePath, '*\n').catch((err) => {
      console.warn(`Failed to write .gitignore in ${configDir}:`, err)
    })
  } catch (error) {
    console.error(`Failed to create config folder: ${configDir}`, error)
    throw error
  }
}

// Track which DBs have already been migrated this session to avoid redundant work
const migratedDbs = new Set<string>()

/**
 * One-time migration: if the DB still contains absolute paths (legacy format),
 * convert them all to root-relative paths so the library is portable.
 * Safe to call repeatedly — skips if migration already ran this session or
 * if all paths are already relative.
 */
function migrateAbsolutePathsToRelative(
  database: Database.Database,
  rootPath: string,
): void {
  const dbId = rootPath
  if (migratedDbs.has(dbId)) return

  try {
    // Check if there are any absolute paths in images (they start with rootPath)
    const sample = database
      .prepare(`SELECT file_path FROM images WHERE file_path LIKE ? LIMIT 1`)
      .get(`${rootPath}%`) as { file_path: string } | undefined

    if (!sample) {
      // No absolute paths found — already migrated or empty DB
      migratedDbs.add(dbId)
      return
    }

    console.log(`[migration] Converting absolute paths to relative in: ${rootPath}`)

    // Migrate images.file_path
    const allImages = database
      .prepare(`SELECT id, file_path, thumbnail_path FROM images`)
      .all() as { id: number; file_path: string; thumbnail_path: string | null }[]

    const updateImage = database.prepare(
      `UPDATE images SET file_path = ?, thumbnail_path = ? WHERE id = ?`,
    )

    const migrateImages = database.transaction(() => {
      for (const img of allImages) {
        const relFilePath = img.file_path.startsWith(rootPath)
          ? toRelativePath(rootPath, img.file_path)
          : img.file_path

        const relThumbPath =
          img.thumbnail_path && img.thumbnail_path.startsWith(rootPath)
            ? toRelativePath(rootPath, img.thumbnail_path)
            : img.thumbnail_path

        updateImage.run(relFilePath, relThumbPath, img.id)
      }
    })
    migrateImages()

    // Migrate folders.path
    const allFolders = database
      .prepare(`SELECT id, path FROM folders`)
      .all() as { id: number; path: string }[]

    const updateFolder = database.prepare(`UPDATE folders SET path = ? WHERE id = ?`)
    const migrateFolders = database.transaction(() => {
      for (const folder of allFolders) {
        if (folder.path === rootPath) {
          // Root folder: rename to "/"
          updateFolder.run('/', folder.id)
        } else if (folder.path.startsWith(rootPath)) {
          updateFolder.run(toRelativePath(rootPath, folder.path), folder.id)
        }
        // else: already relative or unrecognized — leave as-is
      }
    })
    migrateFolders()

    console.log(`[migration] Migrated ${allImages.length} images and ${allFolders.length} folders to relative paths`)
    migratedDbs.add(dbId)
  } catch (err) {
    console.error(`[migration] Failed to migrate paths:`, err)
  }
}
