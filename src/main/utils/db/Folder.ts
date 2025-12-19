import { FolderModel } from '@main/types/models.shared'
import { CONFIG_DIR } from '../config'
import Database from 'better-sqlite3'
import { readdir } from 'fs/promises'
import { join } from 'path'

export function insertFolders(
  db: Database.Database,
  folders: { name: string; path: string; parentId: number | null }[],
): void {
  if (folders.length === 0) return

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO folders 
    (name, path, parent_id)
    VALUES (?, ?, ?)
  `)

  const transaction = db.transaction(
    (folderList: { name: string; path: string; parentId: number | null }[]) => {
      for (const folder of folderList) {
        insertStmt.run(folder.name, folder.path, folder.parentId)
      }
    },
  )

  transaction(folders)
}

export function getAllFolders(db: Database.Database): FolderModel[] {
  const stmt = db.prepare(`
    SELECT 
      id,
      name,
      parent_id as parentId,
      path,
      created_at as createdAt
    FROM folders
    ORDER BY name
  `)

  const folders = stmt.all() as FolderModel[]

  // Build tree structure
  const folderMap = new Map<number, FolderModel>()
  const rootFolders: FolderModel[] = []

  // First pass: create map and initialize children array
  folders.forEach(folder => {
    folder.children = []
    folderMap.set(folder.id, folder)
  })

  // Second pass: link parents and children
  folders.forEach(folder => {
    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId)
      if (parent) {
        parent.children?.push(folder)
      }
    } else {
      rootFolders.push(folder)
    }
  })

  return rootFolders
}

/**
 * Helper to process directory structure from file paths or direct scanning
 */
export async function syncFoldersFromDisk(
  db: Database.Database,
  rootPath: string,
): Promise<void> {
  // Ensure root exists
  const rootName = rootPath.split('/').pop() || 'Root'
  let rootId = (
    db.prepare('SELECT id FROM folders WHERE path = ?').get(rootPath) as
      | { id: number }
      | undefined
  )?.id

  if (!rootId) {
    const result = db
      .prepare(
        'INSERT OR IGNORE INTO folders (name, path, parent_id) VALUES (?, ?, ?)',
      )
      .run(rootName, rootPath, null)

    // If it was ignored (already exists but we missed it logic?), retrieve it again
    // But since path is unique and we checked before, this insert should work or be ignored.
    // If inserted, lastInsertRowid is the ID.
    rootId = result.lastInsertRowid as number
    if (result.changes === 0) {
      // Should not happen given the check above, but safe fallback
      rootId = (
        db.prepare('SELECT id FROM folders WHERE path = ?').get(rootPath) as {
          id: number
        }
      ).id
    }
  }

  try {
    // @ts-ignore - recursive option is available in recent node versions
    const entries = await readdir(rootPath, {
      recursive: true,
      withFileTypes: true,
    })
    const directories = entries.filter(
      e => e.isDirectory() && e.name !== CONFIG_DIR && !e.name.startsWith('.'),
    )

    console.log(`Found ${directories.length} folders in ${rootPath}`)

    // Optimization: Read all existing folders into a map [path -> id]
    const existing = db.prepare('SELECT path, id FROM folders').all() as {
      path: string
      id: number
    }[]
    const pathMap = new Map<string, number>(existing.map(e => [e.path, e.id]))

    if (!pathMap.has(rootPath)) pathMap.set(rootPath, rootId)

    // Sort directories by path length ensures parents come before children generally
    // Add fallback for parentPath if it doesn't exist (older node)
    directories.sort((a, b) => {
      // Wait, dirent.path was added in v18.17.0. Before that we can't easily know parent if recursive.
      // If readdir is recursive, we get all files.
      // Let's assume parentPath exists or we need a different approach.
      return (a.parentPath?.length || 0) - (b.parentPath?.length || 0)
    })

    for (const dir of directories) {
      if (!dir.parentPath) {
        console.warn(
          `Skipping ${dir.name} - no parentPath (Node version issue?)`,
        )
        continue
      }
      const fullPath = join(dir.parentPath, dir.name)
      if (pathMap.has(fullPath)) continue

      console.log(`Processing folder: ${fullPath} (parent: ${dir.parentPath})`)

      // check parent
      const parentPath = dir.parentPath
      const parentId = pathMap.get(parentPath)

      if (parentId) {
        const result = db
          .prepare(
            'INSERT OR IGNORE INTO folders (name, path, parent_id) VALUES (?, ?, ?)',
          )
          .run(dir.name, fullPath, parentId)
        if (result.changes > 0) {
          pathMap.set(fullPath, result.lastInsertRowid as number)
          console.log(
            `Inserted folder: ${fullPath} (id: ${result.lastInsertRowid})`,
          )
        } else {
          // exists
          const existingId = (
            db
              .prepare('SELECT id FROM folders WHERE path = ?')
              .get(fullPath) as { id: number }
          ).id
          pathMap.set(fullPath, existingId)
        }
      } else {
        console.warn(
          `Parent not found for ${fullPath} (parent path: ${parentPath})`,
        )
      }
    }

    // No batch insert needed since we did it inside loop
  } catch (e) {
    console.error('Error syncing folders', e)
  }
}
