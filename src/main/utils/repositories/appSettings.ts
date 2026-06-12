import { AppSettingModel, SettingValue, InferValueTypeKey } from '@main/types/models.shared'
import Database from 'better-sqlite3'

export class AppSettingsRepository {
  constructor(private db: Database.Database) {}

  getAllSettings(): AppSettingModel[] {
    const stmt = this.db.prepare(`
      SELECT 
        key_name as keyName,
        setting_value as settingValue,
        value_type as valueType,
        updated_at as updatedAt
      FROM app_settings
    `)
    return stmt.all() as AppSettingModel[]
  }

  getSetting(key: string): AppSettingModel | undefined {
    const stmt = this.db.prepare(`
      SELECT 
        key_name as keyName,
        setting_value as settingValue,
        value_type as valueType,
        updated_at as updatedAt
      FROM app_settings
      WHERE key_name = ?
    `)
    return stmt.get(key) as AppSettingModel | undefined
  }

  getParsedValue<T extends SettingValue = SettingValue>(key: string): T | undefined {
    const setting = this.getSetting(key)
    if (!setting) return undefined
    return this.parseValue(setting.settingValue, setting.valueType) as any
  }

  setSetting<T extends SettingValue>(
    key: string,
    value: T,
    valueType: InferValueTypeKey<T> = 'string' as any,
  ): void {
    let stringValue = ''
    if (value === null || value === undefined) {
      stringValue = 'null'
    } else if (valueType === 'json' || valueType === 'json_array') {
      stringValue = JSON.stringify(value)
    } else {
      stringValue = String(value)
    }

    const stmt = this.db.prepare(`
      INSERT INTO app_settings (key_name, setting_value, value_type, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key_name) DO UPDATE SET
        setting_value = excluded.setting_value,
        value_type = excluded.value_type,
        updated_at = CURRENT_TIMESTAMP
    `)
    stmt.run(key, stringValue, valueType)
  }

  deleteSetting(key: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM app_settings WHERE key_name = ?
    `)
    stmt.run(key)
  }

  private parseValue(
    value: string,
    type: 'string' | 'number' | 'boolean' | 'json' | 'json_array',
  ): SettingValue {
    try {
      if (value === 'null' || value === 'undefined') return null
      switch (type) {
        case 'number':
          return Number(value)
        case 'boolean':
          return value === 'true' || value === '1'
        case 'json':
        case 'json_array':
          return JSON.parse(value)
        case 'string':
        default:
          return value
      }
    } catch (e) {
      console.error(`Failed to parse setting value for type ${type}:`, e)
      return value
    }
  }
}
