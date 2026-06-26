import { CONFIG_DIR, getAndInitConfig } from '@main/utils/files/config'
import { deleteFileToTrash } from '@main/utils/files/delete'
import { toAbsolutePath, toRelativePath } from '@main/utils/pathUtils'
import { FolderRepository } from '@main/utils/repositories/Folder'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import { APP_SETTING_KEYS } from '@main/utils/appSettingsKeys'
import { BrowserWindow } from 'electron'
import fs from 'fs/promises'
import { dirname, join } from 'path'

export async function addFolderHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  parentPath: string,
  folderName: string,
): Promise<{
  id: number
  name: string
  path: string
  parentId: number | null
}> {
  const { db: database } = await getAndInitConfig(folderPath)
  const rootPath = folderPath

  const absParentPath =
    parentPath.startsWith('/') && !parentPath.startsWith(rootPath)
      ? toAbsolutePath(rootPath, parentPath)
      : parentPath

  const absNewFolderPath = join(absParentPath, folderName)
  const newFolderPath = toRelativePath(rootPath, absNewFolderPath)

  // 1. Create physical directory on disk
  await fs.mkdir(absNewFolderPath, { recursive: true })

  // 2. Find parent ID in database
  const parentRelPath = toRelativePath(rootPath, absParentPath)
  const parentRow = database
    .prepare('SELECT id FROM folders WHERE path = ?')
    .get(parentRelPath) as { id: number } | undefined
  const parentId = parentRow ? parentRow.id : null

  // 3. Insert folder record into database
  const result = database
    .prepare(
      'INSERT OR IGNORE INTO folders (name, path, parent_id) VALUES (?, ?, ?)',
    )
    .run(folderName, newFolderPath, parentId)

  let folderId = result.lastInsertRowid as number
  if (result.changes === 0) {
    // Query ID of existing folder
    const existing = database
      .prepare('SELECT id FROM folders WHERE path = ?')
      .get(newFolderPath) as {
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
  folderPath: string,
  folderId: number,
  newName: string,
): Promise<{ id: number; name: string; path: string }> {
  const { db: database } = await getAndInitConfig(folderPath)
  const rootPath = folderPath

  // Get current folder details
  const folder = database
    .prepare(
      'SELECT name, path, parent_id as parentId FROM folders WHERE id = ?',
    )
    .get(folderId) as
    | { name: string; path: string; parentId: number | null }
    | undefined

  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found.`)
  }

  const parentPath = dirname(folder.path)
  const newFolderPath = join(parentPath, newName) // relative new path (e.g. "/BSS")

  if (folder.path === newFolderPath) {
    return {
      id: folderId,
      name: folder.name,
      path: toAbsolutePath(rootPath, folder.path),
    }
  }

  const absOldPath = toAbsolutePath(rootPath, folder.path)
  const absNewPath = toAbsolutePath(rootPath, newFolderPath)

  // 1. Rename physical directory on disk
  await fs.rename(absOldPath, absNewPath)

  // 2. Execute updates in a database transaction
  const updateTransaction = database.transaction(() => {
    // A. Update the folder itself
    database
      .prepare('UPDATE folders SET name = ?, path = ? WHERE id = ?')
      .run(newName, newFolderPath, folderId)

    // B. Update nested subfolders
    const prefix = folder.path + '/'
    const prefixBackslash = folder.path + '\\'
    const subfolders = database
      .prepare('SELECT id, path FROM folders WHERE path LIKE ? OR path LIKE ?')
      .all(folder.path + '/%', folder.path + '\\%') as {
      id: number
      path: string
    }[]

    for (const sub of subfolders) {
      let relative = ''
      if (sub.path.startsWith(prefix)) {
        relative = sub.path.slice(prefix.length)
      } else if (sub.path.startsWith(prefixBackslash)) {
        relative = sub.path.slice(prefixBackslash.length)
      }
      const newSubPath = join(newFolderPath, relative)
      database
        .prepare('UPDATE folders SET path = ? WHERE id = ?')
        .run(newSubPath, sub.id)
    }

    // C. Update physical images' file paths inside database
    const images = database
      .prepare(
        'SELECT id, file_path FROM images WHERE file_path LIKE ? OR file_path LIKE ?',
      )
      .all(folder.path + '/%', folder.path + '\\%') as {
      id: number
      file_path: string
    }[]

    for (const img of images) {
      let relative = ''
      if (img.file_path.startsWith(prefix)) {
        relative = img.file_path.slice(prefix.length)
      } else if (img.file_path.startsWith(prefixBackslash)) {
        relative = img.file_path.slice(prefixBackslash.length)
      }
      const newImgPath = join(newFolderPath, relative)
      database
        .prepare('UPDATE images SET file_path = ? WHERE id = ?')
        .run(newImgPath, img.id)
    }
  })

  updateTransaction()

  return {
    id: folderId,
    name: newName,
    path: absNewPath,
  }
}

export async function deleteFolderHandler(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  folderId: number,
): Promise<void> {
  const { db: database } = await getAndInitConfig(folderPath)
  const rootPath = folderPath

  // Get current folder details
  const folder = database
    .prepare('SELECT path FROM folders WHERE id = ?')
    .get(folderId) as { path: string } | undefined

  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found.`)
  }

  const absFolderPath = toAbsolutePath(rootPath, folder.path)

  // 1. Move physical directory to OS trash/recycle bin first
  try {
    await deleteFileToTrash(absFolderPath)
  } catch (err) {
    console.error(`Failed to move folder to trash: ${absFolderPath}`, err)
    throw new Error(`Failed to trash folder: ${(err as Error).message}`)
  }

  // 2. Soft delete inside database
  const folderRepo = new FolderRepository(database, rootPath)
  folderRepo.softDeleteFolder(folderId)

  // Focus window after trashing to prevent focus/input freeze issues on Linux
  try {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window && !window.isDestroyed()) {
      window.blur()
      window.focus()
    }
  } catch (focusErr) {
    console.error('Failed to refocus window:', focusErr)
  }
}

export async function customizeFolderHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  folderId: number,
  icon: string | null,
  color: string | null,
): Promise<void> {
  const { db: database } = await getAndInitConfig(folderPath)

  database
    .prepare('UPDATE folders SET icon = ?, color = ? WHERE id = ?')
    .run(icon, color, folderId)
}

export async function isNewFolderHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<boolean> {
  const configDir = join(folderPath, CONFIG_DIR)
  try {
    await fs.access(configDir)
    return false
  } catch {
    return true
  }
}

export async function initWithSettingsHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  settings: {
    aiEnabled: boolean
    clipModel: string
    thumbnailQuality: number | null
  },
): Promise<void> {
  const { db: database } = await getAndInitConfig(folderPath)
  const repo = new AppSettingsRepository(database)
  repo.setSetting(APP_SETTING_KEYS.CLIP_ENABLED, settings.aiEnabled, 'boolean')
  repo.setSetting(
    APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
    settings.clipModel,
    'string',
  )
  repo.setSetting(
    APP_SETTING_KEYS.THUMBNAIL_QUALITY,
    settings.thumbnailQuality,
    'number',
  )
}
