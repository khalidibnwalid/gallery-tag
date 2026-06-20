import { clipService } from '@main/services/clip.service'
import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { runMigrations } from './migration'

class DBSingleton {
  private static instance: DBSingleton
  private connections: Map<string, Database.Database> = new Map()

  private constructor() {}

  static getInstance(): DBSingleton {
    if (!DBSingleton.instance) {
      DBSingleton.instance = new DBSingleton()
    }
    return DBSingleton.instance
  }

  /**
   * gets or creates a database connection for the given path
   */
  getDatabase(dbPath: string): Database.Database {
    if (this.connections.has(dbPath)) return this.connections.get(dbPath)!

    // create new connection
    const db = this.initDB(dbPath)
    this.connections.set(dbPath, db)
    console.log(`Database connection established: ${dbPath}`)

    return db
  }

  getFirstDatabase(): Database.Database | null {
    const firstPath = this.connections.keys().next().value
    if (firstPath) return this.connections.get(firstPath)!

    return null
  }

  closeDatabase(dbPath?: string): void {
    if (dbPath) {
      // close specific database
      const db = this.connections.get(dbPath)
      if (db) {
        db.close()
        this.connections.delete(dbPath)
        console.log(`Database connection closed: ${dbPath}`)
      }
      return
    }
    // close all databases
    for (const [path, db] of this.connections) {
      db.close()
      console.log(`Database connection closed: ${path}`)
    }
    this.connections.clear()
  }

  isConnected(dbPath?: string): boolean {
    if (dbPath) {
      return this.connections.has(dbPath)
    }
    return this.connections.size > 0
  }

  getConnectedPaths(): string[] {
    return Array.from(this.connections.keys())
  }

  /**
   * init database with required tables
   */
  private initDB(dbPath: string): Database.Database {
    const db = new Database(dbPath)

    try {
      let loadablePath = sqliteVec.getLoadablePath()
      if (loadablePath.includes('app.asar') && !loadablePath.includes('app.asar.unpacked')) {
        loadablePath = loadablePath.replace('app.asar', 'app.asar.unpacked')
      }
      db.loadExtension(loadablePath)
      console.log('sqlite-vec extension loaded successfully')
    } catch (e) {
      console.error('Failed to load sqlite-vec extension:', e)
    }

    db.pragma('journal_mode = WAL')

    // 1. Run migrations
    runMigrations(db)

    // 2. Load settings into CLIP service so we know the correct active model name
    clipService.loadSettingsFromDb(db)

    const currentDim = clipService.getEmbeddingDimension()
    const tableName = clipService.getVectorTableName()

    // Check if the model-specific table exists and has a dimension mismatch
    const tableInfo = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get(tableName) as { sql: string } | undefined

    if (tableInfo) {
      const match = tableInfo.sql.match(/float\[(\d+)\]/)
      if (match) {
        const existingDim = parseInt(match[1], 10)
        if (existingDim !== currentDim) {
          console.log(
            `Dimension mismatch for ${tableName}: existing=${existingDim}, new=${currentDim}. Dropping table to allow re-indexing...`,
          )
          db.exec(`DROP TABLE ${tableName}`)
        }
      }
    }

    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} USING vec0(
          image_id integer primary key,
          embedding float[${currentDim}] distance_metric=cosine
        )
      `)

    console.log(`Database initialized: ${dbPath}`)
    return db
  }
}

export const db = DBSingleton.getInstance()

process.on('SIGINT', () => {
  console.log('Closing all database connections...')
  db.closeDatabase() // closes all connections
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('Closing all database connections...')
  db.closeDatabase() // closes all connections
  process.exit(0)
})
