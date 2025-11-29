import Database from 'better-sqlite3'
import { constants } from 'fs'
import { access, mkdir } from 'fs/promises'
import { join } from 'path'
import { initDB } from './db/db'

export const CONFIG_FOLDER = '.gallery'
export const CONFIG_FILE = 'gallery.sqlite'

interface ConfigPaths {
  configDir: string
  dbPath: string
}

/**
 * get or create config folder and database
 */
export async function getConfig(baseDir: string): Promise<{
  configDir: string
  dbPath: string
  db: Database.Database
}> {
  const { configDir, dbPath } = getConfigPaths(baseDir)

  if (!(await configExists(configDir))) await createConfigFolder(configDir)
  const db = initDB(dbPath)

  return { configDir, dbPath, db }
}

function getConfigPaths(baseDir: string): ConfigPaths {
  const configDir = join(baseDir, CONFIG_FOLDER)
  const dbPath = join(configDir, CONFIG_FILE)

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

async function createConfigFolder(configDir: string): Promise<void> {
  try {
    await mkdir(configDir, { recursive: true })
    console.log(`Created config folder: ${configDir}`)
  } catch (error) {
    console.error(`Failed to create config folder: ${configDir}`, error)
    throw error
  }
}
