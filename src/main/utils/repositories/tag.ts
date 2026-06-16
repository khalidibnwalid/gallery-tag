import { TagModel } from '@main/types/models.shared'
import { SuggestedTag } from '@main/types/api.shared'
import { clipService } from '@main/services/clip.service'
import Database from 'better-sqlite3'

export class TagRepository {
  constructor(private db: Database.Database) {}

  getOrCreateTags(
    tagsData: (
      | { id: undefined; name: string; color?: string }
      | { id: number; name?: string; color?: string }
    )[],
  ): TagModel[] {
    const transaction = this.db.transaction(() => {
      const results: TagModel[] = []
      const pendingNames: string[] = []

      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO tags (name, color)
        SELECT ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM tags WHERE LOWER(name) = LOWER(?)
        )
        RETURNING *
      `)

      for (const tagData of tagsData) {
        const existingTag =
          tagData?.id !== undefined ? this.getTagById(tagData.id) : undefined
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
        const existingTags = this.getTagsByName(pendingNames)
        results.push(...existingTags)
      }

      return results
    })

    return transaction()
  }

  getTagById(tagId: number): TagModel | undefined {
    const stmt = this.db.prepare(`
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

  getTagsByName(name: string): TagModel | undefined
  getTagsByName(name: string[]): TagModel[]
  getTagsByName(name: string | string[]): TagModel | TagModel[] | undefined {
    const isSingle = !Array.isArray(name)
    const names = isSingle ? [name as string] : (name as string[])
    const placeholders = names.map(() => 'LOWER(?)').join(',')

    const stmt = this.db.prepare(`
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

  getAllTags(): TagModel[] {
    const stmt = this.db.prepare(`
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

  getTagsBySearch(query: string): TagModel[] {
    const stmt = this.db.prepare(`
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

  addTagsToImages(tagIds: number[], imageIds: number[]): void {
    if (tagIds.length === 0 || imageIds.length === 0) {
      return
    }

    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO image_tags (image_id, tag_id)
      VALUES (?, ?)
    `)

    for (const imageId of imageIds) {
      for (const tagId of tagIds) {
        insertStmt.run(imageId, tagId)
      }
    }
  }

  removeTagsFromImages(tagIds: number[], imageIds: number[]): void {
    if (tagIds.length === 0 || imageIds.length === 0) {
      return
    }

    const deleteStmt = this.db.prepare(`
      DELETE FROM image_tags 
      WHERE image_id = ? AND tag_id = ?
    `)

    for (const imageId of imageIds) {
      for (const tagId of tagIds) {
        deleteStmt.run(imageId, tagId)
      }
    }
  }

  renameTag(tagId: number, newName: string): TagModel | undefined {
    const stmt = this.db.prepare(`
      UPDATE tags
      SET name = ?
      WHERE id = ?
      RETURNING id, name, color, created_at as createdAt
    `)
    return stmt.get(newName, tagId) as TagModel | undefined
  }

  removeTagFromAllImages(tagId: number): void {
    this.db.prepare(`DELETE FROM image_tags WHERE tag_id = ?`).run(tagId)
  }

  deleteTag(tagId: number): boolean {
    this.removeTagFromAllImages(tagId)
    const stmt = this.db.prepare(`DELETE FROM tags WHERE id = ?`)
    const result = stmt.run(tagId)
    return result.changes > 0
  }

  getSuggestedTagsForImage({
    imageId,
    neighborCount = 20,
    limit = 12,
    excludeTagNames = [],
  }: {
    imageId: number
    neighborCount?: number
    limit?: number
    excludeTagNames?: string[]
  }): SuggestedTag[] {
    const vecTable = clipService.getVectorTableName()
    const sourceEmbedding = this.db
      .prepare(`SELECT embedding FROM ${vecTable} WHERE image_id = ?`)
      .get(imageId) as { embedding?: Buffer | Float32Array } | undefined

    if (!sourceEmbedding?.embedding) return []
    const embeddingBuffer = Buffer.isBuffer(sourceEmbedding.embedding)
      ? sourceEmbedding.embedding
      : Buffer.from(
          sourceEmbedding.embedding.buffer,
          sourceEmbedding.embedding.byteOffset,
          sourceEmbedding.embedding.byteLength,
        )

    const safeNeighborCount = Math.max(10, Math.min(neighborCount, 50))
    const safeLimit = Math.max(1, Math.min(limit, 50))
    const normalizedExcludedNames = excludeTagNames
      .map(tag => tag.trim().toLowerCase())
      .filter(Boolean)

    const excludeSql =
      normalizedExcludedNames.length > 0
        ? `AND LOWER(t.name) NOT IN (${normalizedExcludedNames.map(() => '?').join(',')})`
        : ''

    const neighborRows = this.db
      .prepare(
        `
        WITH nearest AS (
          SELECT image_id, distance
          FROM ${vecTable}
          WHERE embedding MATCH ? AND k = ?
        )
        SELECT
          t.id,
          t.name,
          t.color,
          t.created_at as createdAt,
          t.parent_id as parentId,
          n.image_id as imageId,
          n.distance
        FROM nearest n
        JOIN images i ON i.id = n.image_id
        JOIN image_tags it ON it.image_id = n.image_id
        JOIN tags t ON t.id = it.tag_id
        WHERE n.image_id != ?
          AND i.deleted_at IS NULL
          ${excludeSql}
        ORDER BY n.distance ASC
        `,
      )
      .all(
        embeddingBuffer,
        safeNeighborCount + 1,
        imageId,
        ...normalizedExcludedNames,
      ) as (TagModel & { imageId: number; distance: number })[]

    if (neighborRows.length === 0) return []

    const totalImagesResult = this.db
      .prepare(
        `
        SELECT COUNT(*) as total
        FROM images
        WHERE deleted_at IS NULL
      `,
      )
      .get() as { total: number } | undefined
    const totalImages = Math.max(totalImagesResult?.total || 0, 1)

    const candidateTagIds = [...new Set(neighborRows.map(row => row.id))]
    const tagFrequencyRows = this.db
      .prepare(
        `
        SELECT it.tag_id as tagId, COUNT(DISTINCT it.image_id) as imageCount
        FROM image_tags it
        JOIN images i ON i.id = it.image_id
        WHERE i.deleted_at IS NULL
          AND it.tag_id IN (${candidateTagIds.map(() => '?').join(',')})
        GROUP BY it.tag_id
      `,
      )
      .all(...candidateTagIds) as { tagId: number; imageCount: number }[]

    const globalTagFrequency = new Map(
      tagFrequencyRows.map(row => [row.tagId, row.imageCount]),
    )
    const scores = new Map<number, SuggestedTag>()

    for (const row of neighborRows) {
      const similarity = Math.max(0, 1 - row.distance)
      if (similarity <= 0) continue

      const existing = scores.get(row.id)
      const globalImageCount = globalTagFrequency.get(row.id) || 0
      const idf = Math.log((1 + totalImages) / (1 + globalImageCount)) + 1

      if (existing) {
        existing.similaritySum += similarity
        existing.usageCount += 1
        existing.score = existing.similaritySum * idf
      } else {
        scores.set(row.id, {
          id: row.id,
          name: row.name,
          color: row.color,
          createdAt: row.createdAt,
          parentId: row.parentId,
          similaritySum: similarity,
          usageCount: 1,
          idf,
          score: similarity * idf,
        })
      }
    }

    return [...scores.values()]
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, safeLimit)
  }
}
