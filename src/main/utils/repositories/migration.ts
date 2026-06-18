import Database from 'better-sqlite3'

const migrationModules = import.meta.glob('./migrations/*.ts', { eager: true }) as Record<
  string,
  { up: (db: Database.Database) => void }
>

const sortedMigrationKeys = Object.keys(migrationModules).sort()
const migrations = sortedMigrationKeys.map((key) => migrationModules[key].up)

export function runMigrations(db: Database.Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number
  const targetVersion = migrations.length

  if (currentVersion >= targetVersion) return

  console.log(`Database version: ${currentVersion}. Target version: ${targetVersion}.`)

  const applyMigrations = db.transaction((fromVersion: number, toVersion: number) => {
    for (let i = fromVersion; i < toVersion; i++) {
      console.log(`Applying migration v${i + 1} (${sortedMigrationKeys[i]})...`)
      migrations[i](db)
      db.pragma(`user_version = ${i + 1}`)
    }
  })

  applyMigrations(currentVersion, targetVersion)
  console.log(`Database migrated successfully to version ${targetVersion}`)
}
