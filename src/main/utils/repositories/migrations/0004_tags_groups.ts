import Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  const pragma = db.prepare('PRAGMA table_info(tags)').all() as {
    name: string
  }[]
  const hasParentId = pragma.some(col => col.name === 'parent_id')

  if (!hasParentId) {
    db.exec(`
      ALTER TABLE tags ADD COLUMN icon TEXT;
      ALTER TABLE tags ADD COLUMN color TEXT;
      ALTER TABLE tags ADD COLUMN parent_id INTEGER REFERENCES tags(id);
    `)
  }
}
