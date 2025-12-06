import { TagModel } from '@main/types/models.shared';
import Database from 'better-sqlite3';

export function getOrCreateTags(
  db: Database.Database,
  tagsData: (
    | { id: undefined; name: string; color?: string }
    | { id: number; name?: string; color?: string }
  )[],
): TagModel[] {
  const transaction = db.transaction(() => {
    const results: TagModel[] = []

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
        const newTag = insertStmt.get(
          tagData.name,
          tagData.color || null,
          tagData.name,
        ) as TagModel
        results.push(newTag)
      }
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

  // Execute within current transaction context
  // If called from within a transaction, it will be part of that transaction
  // If called standalone, it will auto-commit each statement
  for (const imageId of imageIds) {
    for (const tagId of tagIds) {
      insertStmt.run(imageId, tagId)
    }
  }
}
