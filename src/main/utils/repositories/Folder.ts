import { FolderModel } from '@main/types/models.shared'
import { CONFIG_DIR } from '../files/config'
import Database from 'better-sqlite3'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { toRelativePath, toAbsolutePath } from '../pathUtils'

export class FolderRepository {
  constructor(
    private db: Database.Database,
    private rootPath: string,
  ) {}

  insertFolders(
    folders: { name: string; path: string; parentId: number | null }[],
  ): void {
    if (folders.length === 0) return

    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO folders 
      (name, path, parent_id)
      VALUES (?, ?, ?)
    `)

    const transaction = this.db.transaction(
      (
        folderList: { name: string; path: string; parentId: number | null }[],
      ) => {
        for (const folder of folderList) {
          insertStmt.run(folder.name, folder.path, folder.parentId)
        }
      },
    )

    transaction(folders)
  }

  getAllFolders(): FolderModel[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        name,
        parent_id as parentId,
        path,
        created_at as createdAt,
        deleted_at as deletedAt
      FROM folders
      WHERE deleted_at IS NULL
      ORDER BY name
    `)

    const folders = stmt.all() as FolderModel[]

    // Resolve stored relative paths back to absolute before returning
    folders.forEach(folder => {
      folder.path = toAbsolutePath(this.rootPath, folder.path)
    })

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
  async syncFoldersFromDisk(rootPath: string): Promise<void> {
    // Root folder is always stored as "/" (portable)
    const rootRelPath = '/'
    let rootId = (
      this.db.prepare('SELECT id FROM folders WHERE path = ?').get(rootRelPath) as
        | { id: number }
        | undefined
    )?.id

    if (!rootId) {
      const result = this.db
        .prepare(
          'INSERT OR IGNORE INTO folders (name, path, parent_id) VALUES (?, ?, ?)',
        )
        .run('/', rootRelPath, null)

      rootId = result.lastInsertRowid as number
      if (result.changes === 0) {
        rootId = (
          this.db
            .prepare('SELECT id FROM folders WHERE path = ?')
            .get(rootRelPath) as {
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
        e =>
          e.isDirectory() && e.name !== CONFIG_DIR && !e.name.startsWith('.'),
      )

      console.log(`Found ${directories.length} folders in ${rootPath}`)

      // Optimization: Read all existing folders into a map [path -> id]
      const existing = this.db
        .prepare('SELECT path, id, deleted_at FROM folders')
        .all() as {
        path: string
        id: number
        deleted_at: string | null
      }[]
      const pathMap = new Map<string, number>(existing.map(e => [e.path, e.id]))
      const deletedPaths = new Map<string, number>(
        existing.filter(e => e.deleted_at !== null).map(e => [e.path, e.id])
      )

      if (!pathMap.has(rootRelPath)) pathMap.set(rootRelPath, rootId)

      // Sort directories by path length ensures parents come before children generally
      directories.sort((a, b) => {
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
        const relPath = toRelativePath(rootPath, fullPath)
        if (pathMap.has(relPath)) {
          // If the folder is currently soft-deleted but exists on disk, recover it
          if (deletedPaths.has(relPath)) {
            this.db
              .prepare('UPDATE folders SET deleted_at = NULL WHERE id = ?')
              .run(pathMap.get(relPath))
            console.log(`Recovered soft-deleted folder from disk: ${fullPath}`)
          }
          continue
        }

        console.log(
          `Processing folder: ${fullPath} (parent: ${dir.parentPath})`,
        )

        // check parent
        const parentFullPath = dir.parentPath
        const parentRelPath = toRelativePath(rootPath, parentFullPath)
        const parentId = pathMap.get(parentRelPath)

        if (parentId) {
          const result = this.db
            .prepare(
              'INSERT OR IGNORE INTO folders (name, path, parent_id) VALUES (?, ?, ?)',
            )
            .run(dir.name, relPath, parentId)
          if (result.changes > 0) {
            pathMap.set(relPath, result.lastInsertRowid as number)
            console.log(
              `Inserted folder: ${fullPath} (id: ${result.lastInsertRowid})`,
            )
          } else {
            // exists
            const existingId = (
              this.db
                .prepare('SELECT id FROM folders WHERE path = ?')
                .get(relPath) as { id: number }
            ).id
            pathMap.set(relPath, existingId)
          }
        } else {
          console.warn(
            `Parent not found for ${fullPath} (parent path: ${dir.parentPath})`,
          )
        }
      }
    } catch (e) {
      console.error('Error syncing folders', e)
    }
  }

  softDeleteFolder(folderId: number): void {
    const folder = this.db
      .prepare('SELECT path FROM folders WHERE id = ?')
      .get(folderId) as { path: string } | undefined
    if (!folder) return

    const deleteTransaction = this.db.transaction(() => {
      // 1. Soft delete this folder itself
      this.db.prepare('UPDATE folders SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(folderId)

      // 2. Soft delete nested subfolders and their images
      if (folder.path !== '/') {
        // Soft delete subfolders
        this.db
          .prepare(`
            UPDATE folders 
            SET deleted_at = CURRENT_TIMESTAMP 
            WHERE path LIKE ? OR path LIKE ?
          `)
          .run(folder.path + '/%', folder.path + '\\%')

        // Soft delete all images inside this folder and its subfolders
        this.db
          .prepare(`
            UPDATE images 
            SET deleted_at = CURRENT_TIMESTAMP 
            WHERE file_path LIKE ? OR file_path LIKE ?
          `)
          .run(folder.path + '/%', folder.path + '\\%')
      } else {
        // If root path, soft delete everything
        this.db.prepare('UPDATE folders SET deleted_at = CURRENT_TIMESTAMP').run()
        this.db.prepare('UPDATE images SET deleted_at = CURRENT_TIMESTAMP').run()
      }
    })

    deleteTransaction()
  }
}
