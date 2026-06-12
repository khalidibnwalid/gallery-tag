import { join, relative, isAbsolute } from 'path'

/**
 * Convert an absolute path to a root-relative path.
 * The root folder itself is represented as "/".
 */
export function toRelativePath(rootPath: string, absPath: string): string {
  if (absPath === rootPath) return '/'
  const rel = relative(rootPath, absPath)
  // relative() returns e.g. "a/b/img.jpg" — prefix with "/"
  return '/' + rel
}

/**
 * Convert a root-relative path (as stored in DB) back to an absolute path.
 */
export function toAbsolutePath(rootPath: string, relPath: string): string {
  if (relPath === '/') return rootPath
  // Strip the leading "/" before joining
  const stripped = relPath.startsWith('/') ? relPath.slice(1) : relPath
  return join(rootPath, stripped)
}

/**
 * Returns true if the stored path looks like an already-relative path
 * (starts with "/" but is NOT an absolute system path that differs from root).
 */
export function isRelativePath(rootPath: string, path: string): boolean {
  if (path === '/') return true
  if (!isAbsolute(path)) return true
  return !path.startsWith(rootPath)
}
