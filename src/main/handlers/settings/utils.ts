import { db } from '@main/utils/repositories/db'
import { getRootPath } from '@main/utils/files/config'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import Database from 'better-sqlite3'
import { join } from 'path'

export function getActiveDb(folderPath: string): {
  database: Database.Database
  dbPath: string
  rootPath: string
} {
  if (!folderPath) {
    throw new Error('folderPath is required to resolve database connection.')
  }
  const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
  return {
    database: db.getDatabase(dbPath),
    dbPath,
    rootPath: getRootPath(dbPath),
  }
}

export function getSettingsRepo(folderPath: string): AppSettingsRepository {
  const { database } = getActiveDb(folderPath)
  return new AppSettingsRepository(database)
}
