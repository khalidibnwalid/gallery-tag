import { db } from '@main/utils/repositories/db'
import { join, dirname } from 'path'
import fs from 'fs/promises'
import { getRootPath } from '@main/utils/files/config'
import { toRelativePath, toAbsolutePath } from '@main/utils/pathUtils'

export async function addFolderHandler(
  _event: Electron.IpcMainInvokeEvent,
  parentPath: string,
  folderName: string,
): Promise<{ id: number; name: string; path: string; parentId: number | null }> {
  const connectedPaths = db.getConnectedPaths()
  if (connectedPaths.length === 0) {
    throw new Error('No active database connection found. Please load a folder first.')
  }
  const dbPath = connectedPaths[0]
  const database = db.getDatabase(dbPath)
  const rootPath = getRootPath(dbPath)

  const absParentPath = parentPath.startsWith('/') && !parentPath.startsWith(rootPath)
    ? toAbsolutePath(rootPath, parentPath)
    : parentPath

  const absNewFolderPath = join(absParentPath, folderName)
  const newFolderPath = toRelativePath(rootPath, absNewFolderPath)

  // 1. Create physical directory on disk
  await fs.mkdir(absNewFolderPath, { recursive: true })

  // 2. Find parent ID in database
  const parentRelPath = toRelativePath(rootPath, absParentPath)
  const parentRow = database.prepare('SELECT id FROM folders WHERE path = ?').get(parentRelPath) as
    | { id: number }
    | undefined
  const parentId = parentRow ? parentRow.id : null

  // 3. Insert folder record into database
  const result = database
    .prepare('INSERT OR IGNORE INTO folders (name, path, parent_id) VALUES (?, ?, ?)')
    .run(folderName, newFolderPath, parentId)

  let folderId = result.lastInsertRowid as number
  if (result.changes === 0) {
    // Query ID of existing folder
    const existing = database.prepare('SELECT id FROM folders WHERE path = ?').get(newFolderPath) as {
      id: number
    }
    folderId = existing.id
  }

  return {
    id: folderId,
    name: folderName,
    path: absNewFolderPath,
    parentId,
  }
}

export async function renameFolderHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderId: number,
  newName: string,
): Promise<{ id: number; name: string; path: string }> {
  const connectedPaths = db.getConnectedPaths()
  if (connectedPaths.length === 0) {
    throw new Error('No active database connection found. Please load a folder first.')
  }
  const dbPath = connectedPaths[0]
  const database = db.getDatabase(dbPath)
  const rootPath = getRootPath(dbPath)

  // Get current folder details
  const folder = database.prepare('SELECT name, path, parent_id as parentId FROM folders WHERE id = ?').get(folderId) as
    | { name: string; path: string; parentId: number | null }
    | undefined

  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found.`)
  }

  const parentPath = dirname(folder.path)
  const newFolderPath = join(parentPath, newName) // relative new path (e.g. "/BSS")

  if (folder.path === newFolderPath) {
    return { id: folderId, name: folder.name, path: toAbsolutePath(rootPath, folder.path) }
  }

  const absOldPath = toAbsolutePath(rootPath, folder.path)
  const absNewPath = toAbsolutePath(rootPath, newFolderPath)

  // 1. Rename physical directory on disk
  await fs.rename(absOldPath, absNewPath)

  // 2. Execute updates in a database transaction
  const updateTransaction = database.transaction(() => {
    // A. Update the folder itself
    database.prepare('UPDATE folders SET name = ?, path = ? WHERE id = ?').run(newName, newFolderPath, folderId)

    // B. Update nested subfolders
    const prefix = folder.path + '/'
    const prefixBackslash = folder.path + '\\'
    const subfolders = database
      .prepare('SELECT id, path FROM folders WHERE path LIKE ? OR path LIKE ?')
      .all(folder.path + '/%', folder.path + '\\%') as { id: number; path: string }[]

    for (const sub of subfolders) {
      let relative = ''
      if (sub.path.startsWith(prefix)) {
        relative = sub.path.slice(prefix.length)
      } else if (sub.path.startsWith(prefixBackslash)) {
        relative = sub.path.slice(prefixBackslash.length)
      }
      const newSubPath = join(newFolderPath, relative)
      database.prepare('UPDATE folders SET path = ? WHERE id = ?').run(newSubPath, sub.id)
    }

    // C. Update physical images' file paths inside database
    const images = database
      .prepare('SELECT id, file_path FROM images WHERE file_path LIKE ? OR file_path LIKE ?')
      .all(folder.path + '/%', folder.path + '\\%') as { id: number; file_path: string }[]

    for (const img of images) {
      let relative = ''
      if (img.file_path.startsWith(prefix)) {
        relative = img.file_path.slice(prefix.length)
      } else if (img.file_path.startsWith(prefixBackslash)) {
        relative = img.file_path.slice(prefixBackslash.length)
      }
      const newImgPath = join(newFolderPath, relative)
      database.prepare('UPDATE images SET file_path = ? WHERE id = ?').run(newImgPath, img.id)
    }
  })

  updateTransaction()

  return {
    id: folderId,
    name: newName,
    path: absNewPath,
  }
}
