import { TagModel } from '@main/types/models.shared'
import Database from 'better-sqlite3'

export function getOrCreateTags(
  db: Database.Database,
  tagsData: (
    | { id: undefined; name: string; color?: string }
    | { id: number; name?: string; color?: string }
  )[],
): TagModel[] {
  const transaction = db.transaction(() => {
    const results: TagModel[] = []
    const pendingNames: string[] = []

    const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO tags (name, color)
    SELECT ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM tags WHERE LOWER(name) = LOWER(?)
    )
    RETURNING *
  `)

    for (const tagData of tagsData) {
      const existingTag =
        tagData?.id !== undefined ? getTagById(db, tagData.id) : undefined
      if (existingTag) {
        results.push(existingTag)
      } else {
        if (!tagData.name) continue

        const newTag = insertStmt.get(
          tagData.name,
          tagData.color || null,
          tagData.name,
        ) as TagModel | undefined

        if (newTag) {
          results.push(newTag)
        } else {
          pendingNames.push(tagData.name)
        }
      }
    }

    if (pendingNames.length > 0) {
      const existingTags = getTagsByName(db, pendingNames)
      results.push(...existingTags)
    }

    return results
  })

  return transaction()
}

export function getTagById(
  db: Database.Database,
  tagId: number,
): TagModel | undefined {
  const stmt = db.prepare(`
    SELECT 
      id,
      name,
      color,
      created_at as createdAt
    FROM tags
    WHERE id = ?
  `)

  return stmt.get(tagId) as TagModel | undefined
}

export function getTagsByName(
  db: Database.Database,
  name: string,
): TagModel | undefined
export function getTagsByName(db: Database.Database, name: string[]): TagModel[]
export function getTagsByName(
  db: Database.Database,
  name: string | string[],
): TagModel | TagModel[] | undefined {
  const isSingle = !Array.isArray(name)
  const names = isSingle ? [name as string] : (name as string[])
  const placeholders = names.map(() => 'LOWER(?)').join(',')

  const stmt = db.prepare(`
    SELECT 
      id,
      name,
      color,
      created_at as createdAt
    FROM tags
    WHERE name IN (${placeholders})
  `)

  const results = stmt.all(...names) as TagModel[]

  if (isSingle) {
    return results[0]
  }
  return results
}

export function getAllTags(db: Database.Database): TagModel[] {
  const stmt = db.prepare(`
    SELECT 
      id,
      name,
      color,
      created_at as createdAt
    FROM tags 
    ORDER BY name
  `)

  return stmt.all() as TagModel[]
}

export function getTagsBySearch(
  db: Database.Database,
  query: string,
): TagModel[] {
  const stmt = db.prepare(`
    SELECT 
      id,
      name,
      color,
      created_at as createdAt
    FROM tags 
    WHERE name LIKE ?
    ORDER BY name
  `)

  const searchPattern = `%${query}%`
  return stmt.all(searchPattern) as TagModel[]
}

export function addTagsToImages(
  db: Database.Database,
  tagIds: number[],
  imageIds: number[],
): void {
  if (tagIds.length === 0 || imageIds.length === 0) {
    return
  }

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO image_tags (image_id, tag_id)
    VALUES (?, ?)
  `)

  for (const imageId of imageIds) {
    for (const tagId of tagIds) {
      insertStmt.run(imageId, tagId)
    }
  }
}

export function removeTagsFromImages(
  db: Database.Database,
  tagIds: number[],
  imageIds: number[],
): void {
  if (tagIds.length === 0 || imageIds.length === 0) {
    return
  }

  const deleteStmt = db.prepare(`
    DELETE FROM image_tags 
    WHERE image_id = ? AND tag_id = ?
  `)

  for (const imageId of imageIds) {
    for (const tagId of tagIds) {
      deleteStmt.run(imageId, tagId)
    }
  }
}
