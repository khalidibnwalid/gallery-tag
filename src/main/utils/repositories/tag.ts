import { TagModel } from '@main/types/models.shared'
import { SuggestedTag } from '@main/types/api.shared'
import { clipService } from '@main/services/clip.service'
import Database from 'better-sqlite3'

export class TagRepository {
  constructor(private db: Database.Database) {}

  getOrCreateTags(
    tagsData: (
      | { id: undefined; name: string; color?: string; parentId?: number }
      | { id: number; name?: string; color?: string; parentId?: number }
    )[],
  ): TagModel[] {
    const transaction = this.db.transaction(() => {
      const results: TagModel[] = []
      const pendingNames: string[] = []

      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO tags (name, color, parent_id)
        SELECT ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM tags WHERE LOWER(name) = LOWER(?)
        )
        RETURNING id, name, color, created_at as createdAt, parent_id as parentId
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
            tagData.parentId || null,
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
        created_at as createdAt,
        parent_id as parentId
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
        created_at as createdAt,
        parent_id as parentId
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
        created_at as createdAt,
        parent_id as parentId
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
        created_at as createdAt,
        parent_id as parentId
      FROM tags 
      WHERE name LIKE ?
      ORDER BY name
    `)

    const searchPattern = `%${query}%`
    return stmt.all(searchPattern) as TagModel[]
  }

  getAllAncestors(tagIds: number[]): number[] {
    if (tagIds.length === 0) return []
    const placeholders = tagIds.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      WITH RECURSIVE ancestors(id, parent_id) AS (
        SELECT id, parent_id FROM tags WHERE id IN (${placeholders})
        UNION ALL
        SELECT t.id, t.parent_id FROM tags t
        JOIN ancestors a ON t.id = a.parent_id
      )
      SELECT DISTINCT id FROM ancestors WHERE id IS NOT NULL
    `)
    const rows = stmt.all(...tagIds) as { id: number }[]
    return rows.map(r => r.id)
  }

  addTagsToImages(tagIds: number[], imageIds: number[]): void {
    if (tagIds.length === 0 || imageIds.length === 0) {
      return
    }

    const resolvedTagIds = this.getAllAncestors(tagIds)

    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO image_tags (image_id, tag_id)
      VALUES (?, ?)
    `)

    for (const imageId of imageIds) {
      for (const tagId of resolvedTagIds) {
        insertStmt.run(imageId, tagId)
      }
    }
  }

  setParent(tagId: number, parentId: number | null): TagModel | undefined {
    const stmt = this.db.prepare(`
      UPDATE tags
      SET parent_id = ?
      WHERE id = ?
      RETURNING id, name, color, created_at as createdAt, parent_id as parentId
    `)

    if (parentId !== null) {
      if (tagId === parentId) {
        throw new Error('A tag cannot be its own parent')
      }
      let currentParentId: number | null = parentId
      while (currentParentId !== null) {
        const parent = this.getTagById(currentParentId)
        if (!parent) break
        if (parent.parentId === tagId) {
          throw new Error('Circular parent-child relationship detected')
        }
        currentParentId = parent.parentId || null
      }
    }

    return stmt.get(parentId, tagId) as TagModel | undefined
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
          COALESCE(t.global_usage_count, 0) as globalUsageCount,
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
      ) as (TagModel & {
      imageId: number
      distance: number
      globalUsageCount: number
    })[]

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

    const scores = new Map<
      number,
      SuggestedTag & { globalUsageCount: number }
    >()

    for (const row of neighborRows) {
      // Map cosine distance [0, 2] to similarity [0, 1]
      const similarity = Math.max(0, Math.min(1, 1 - row.distance / 2))
      if (similarity <= 0) continue

      const existing = scores.get(row.id)
      if (existing) {
        existing.similaritySum += similarity
        existing.usageCount += 1
      } else {
        scores.set(row.id, {
          id: row.id,
          name: row.name,
          color: row.color,
          createdAt: row.createdAt,
          parentId: row.parentId,
          similaritySum: similarity,
          usageCount: 1,
          idf: 0,
          score: 0,
          globalUsageCount: row.globalUsageCount,
        })
      }
    }

    const results: SuggestedTag[] = []
    for (const candidate of scores.values()) {
      const idf =
        Math.log((1 + totalImages) / (1 + candidate.globalUsageCount)) + 1
      // const score = candidate.similaritySum * localRatio * idf // OLD one

      // AVERAGE_SIMILARITY = candidate.similaritySum / candidate.usageCount
      // LOCAL_RATIO = candidate.usageCount / safeNeighborCount
      // SCORE =  AVERAGE_SIMILARITY * LOCAL_RATION * idf
      // TLDR: Score = Similer (How close?) x Density (How frequent?) x Rarity (How rare?)
      // the score formula code below is the summed version of the one above, with the 'candidate.usageCount' of both gone (candidate.usageCount/candidate.usageCount = 1)

      const score = (candidate.similaritySum / safeNeighborCount) * idf

      results.push({
        id: candidate.id,
        name: candidate.name,
        color: candidate.color,
        createdAt: candidate.createdAt,
        parentId: candidate.parentId,
        similaritySum: candidate.similaritySum,
        usageCount: candidate.usageCount,
        idf,
        score,
      })
    }

    return results
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, safeLimit)
  }
}
