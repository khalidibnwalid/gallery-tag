import { db } from '@main/utils/repositories/db'
import { getRootPath } from '@main/utils/files/config'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import Database from 'better-sqlite3'

export function getActiveDb(): {
  database: Database.Database
  dbPath: string
  rootPath: string
} {
  const connectedPaths = db.getConnectedPaths()
  if (connectedPaths.length === 0) {
    throw new Error(
      'No active database connection found. Please load a folder first.',
    )
  }
  const dbPath = connectedPaths[0]
  return {
    database: db.getDatabase(dbPath),
    dbPath,
    rootPath: getRootPath(dbPath),
  }
}

export function getSettingsRepo(): AppSettingsRepository {
  const { database } = getActiveDb()
  return new AppSettingsRepository(database)
}
