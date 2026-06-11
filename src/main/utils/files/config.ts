import Database from 'better-sqlite3'
import { constants } from 'fs'
import { access, mkdir } from 'fs/promises'
import { join } from 'path'
import { db } from '../repositories/db'

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

  return { configDir, dbPath, db: database }
}

function getConfigPaths(baseDir: string): ConfigPaths {
  const configDir = join(baseDir, CONFIG_DIR)
  const dbPath = join(configDir, CONFIG_DB_FILE)

  return { configDir, dbPath }
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
  } catch (error) {
    console.error(`Failed to create config folder: ${configDir}`, error)
    throw error
  }
}
