import { FileInfo } from '@main/types/global'
import { readdir, stat } from 'fs/promises'
import { basename, dirname, extname, join, resolve } from 'path'

// supported images types
export const EXTENSIONS = {
  IMAGES: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
    '.tiff',
    '.ico',
  ],
} as const

// file size constants
export const FILE_SIZE = {
  BYTES_IN_KB: 1024,
  BYTES_IN_MB: 1024 * 1024,
  BYTES_IN_GB: 1024 * 1024 * 1024,
} as const

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const { BYTES_IN_KB, BYTES_IN_MB, BYTES_IN_GB } = FILE_SIZE

  if (bytes < BYTES_IN_KB) return `${bytes} B`
  if (bytes < BYTES_IN_MB) return `${(bytes / BYTES_IN_KB).toFixed(2)} KB`
  if (bytes < BYTES_IN_GB) return `${(bytes / BYTES_IN_MB).toFixed(2)} MB`
  return `${(bytes / BYTES_IN_GB).toFixed(2)} GB`
}

/**
 * get all files with detailed information recursively from a directory
 */
export async function getFilesByExtension(
  dirPath: string,
  extensions: string[] | ReadonlyArray<string>,
  skipDirs: string[] | string = [],
): Promise<FileInfo[]> {
  const files: FileInfo[] = []
  const basePath = resolve(dirPath)
  skipDirs = Array.isArray(skipDirs) ? skipDirs : [skipDirs]

  const shouldSkipDirectory = (dirName: string, fullPath: string) =>
    skipDirs.some(
      skipPattern =>
        dirName === skipPattern ||
        fullPath.includes(skipPattern) ||
        dirName.includes(skipPattern),
    )

  async function traverse(currentPath: string, depth: number = 0) {
    try {
      const items = await readdir(currentPath)

      for (const item of items) {
        const fullPath = join(currentPath, item)
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          const dirName = basename(fullPath)
          if (
            skipDirs.length === 0 ||
            !shouldSkipDirectory(dirName, fullPath)
          ) {
            await traverse(fullPath, depth + 1)
          }
        } else if (stats.isFile()) {
          const extension = extname(item).toLowerCase()

          if (extensions.includes(extension)) {
            const relativePath = fullPath
              .replace(basePath, '')
              .replace(/^\//, '')

            const fileInfo: FileInfo = {
              fileName: basename(item, extension),
              fullPath,
              relativePath,
              directory: dirname(fullPath),
              extension,

              size: stats.size,
              sizeFormatted: formatFileSize(stats.size),
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              accessedAt: stats.atime,
            }

            files.push(fileInfo)
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error)
    }
  }

  await traverse(dirPath)
  return files
}
