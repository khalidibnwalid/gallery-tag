import Database from 'better-sqlite3'

export function up(db: Database.Database): void {
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
      exif TEXT,
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

  db.exec(`
    -- Optimize duplicate scanning
    CREATE INDEX IF NOT EXISTS idx_images_hash ON images (hash) WHERE deleted_at IS NULL;

    -- Optimize filtering/sorting on active images
    CREATE INDEX IF NOT EXISTS idx_images_created_at ON images (created_at) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_images_modified_at ON images (modified_at) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_images_file_name ON images (file_name) WHERE deleted_at IS NULL;

    -- Junction table optimization: filter images by tag
    CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON image_tags (tag_id);

    -- Folder parent lookup and alphabetical sort optimization
    CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders (parent_id);
    CREATE INDEX IF NOT EXISTS idx_folders_name ON folders (name);

    -- Case-insensitive tag matching and parent lookup optimization
    CREATE INDEX IF NOT EXISTS idx_tags_name_nocase ON tags (name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_tags_parent_id ON tags (parent_id);
  `)
}
