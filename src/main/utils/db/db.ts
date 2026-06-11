import Database from 'better-sqlite3'

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

    // TODO: INDEXES for performance
    db.pragma('journal_mode = WAL')

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
        hash TEXT
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
