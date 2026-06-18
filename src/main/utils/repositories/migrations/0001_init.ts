import Database from 'better-sqlite3'
import { seedAppSettings } from '../../seedSettings'

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key_name TEXT PRIMARY KEY NOT NULL,
      setting_value TEXT NOT NULL,
      value_type TEXT CHECK(value_type IN ('string', 'number', 'boolean', 'json' , 'json_array')) DEFAULT 'string',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  seedAppSettings(db)
}
