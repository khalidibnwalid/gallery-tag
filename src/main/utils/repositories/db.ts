import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { clipService } from '@main/services/clip.service'
import { seedAppSettings } from '../seedSettings'

/*
 * we have an annoying problem, the db place might be used in multiple places and might change in runtime,
 * and we don't want a callback to get the wrong db connection if we change the path midway
 */
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
      sqliteVec.load(db)
      console.log('sqlite-vec extension loaded successfully')
    } catch (e) {
      console.error('Failed to load sqlite-vec extension:', e)
    }

    db.pragma('journal_mode = WAL')

    // 1. Create app_settings table first so we can load/store settings
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key_name TEXT PRIMARY KEY NOT NULL,
        setting_value TEXT NOT NULL,
        value_type TEXT CHECK(value_type IN ('string', 'number', 'boolean', 'json' , 'json_array')) DEFAULT 'string',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 2. Seed default settings (no-op if values already exist)
    seedAppSettings(db)

    // 3. Load settings into CLIP service so we know the correct active model name
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

    db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        extension TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        modified_at DATETIME NOT NULL,
        last_scanned DATETIME DEFAULT CURRENT_TIMESTAMP,
        thumbnail_path TEXT,
        width INTEGER,
        height INTEGER,
        hash TEXT,
        dominant_colors TEXT,
        deleted_at DATETIME,
        is_duplicate INTEGER DEFAULT 0
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        parent_id INTEGER,
        FOREIGN KEY (parent_id) REFERENCES tags (id)
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER, 
        path TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS image_tags (
        image_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (image_id, tag_id),
        FOREIGN KEY (image_id) REFERENCES images (id),
        FOREIGN KEY (tag_id) REFERENCES tags (id)
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS image_colors (
        image_id INTEGER NOT NULL,
        r INTEGER NOT NULL,
        g INTEGER NOT NULL,
        b INTEGER NOT NULL,
        h INTEGER NOT NULL,
        s INTEGER NOT NULL,
        l INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        PRIMARY KEY (image_id, rank),
        FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE CASCADE
      )
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_image_colors_rgb ON image_colors (r, g, b)
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
