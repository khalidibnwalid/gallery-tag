import Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    ALTER TABLE folders ADD COLUMN deleted_at DATETIME;
  `)
}
