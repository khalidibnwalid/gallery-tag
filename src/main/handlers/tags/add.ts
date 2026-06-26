import { SearchFilter } from '@main/types/api.shared'
import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'
import { resolveImageIdsFromFilter } from '@main/utils/queryHelper'

import { join } from 'path'

export default async function addHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  {
    tags,
    imagesIds,
    filter,
  }: {
    tags: (TagModel | Pick<TagModel, 'name' | 'color'>)[]
    imagesIds?: number[]
    filter?: SearchFilter
  },
): Promise<TagModel[]> {
  if (!tags || tags.length === 0 || tags.some(tag => !tag.name)) return []
  try {
    let resolvedImageIds = imagesIds ? [...imagesIds] : []
    if (filter) {
      const idsFromFilter = await resolveImageIdsFromFilter(folderPath, filter)
      resolvedImageIds = Array.from(new Set([...resolvedImageIds, ...idsFromFilter]))
    }

    console.log(
      `Adding tags to ${resolvedImageIds.length} images for folder: ${folderPath}`,
    )

    if (!folderPath) {
      throw new Error('folderPath is required')
    }

    const dbPath = join(folderPath, '.gallery', 'gallery.sqlite')
    const database = db.getDatabase(dbPath)

    const tagRepo = new TagRepository(database)

    let newTags: (Pick<TagModel, 'name' | 'color'> & { parentId?: number })[] =
      []
    let processedTags: TagModel[] = []
    let insertedTags: TagModel[] = []

    for (const tag of tags) {
      // if exists, use it
      if ('id' in tag) {
        processedTags.push(tag as TagModel)
      } else {
        newTags.push({
          name: tag.name.trim(),
          color: tag.color,
          parentId: (tag as TagModel).parentId,
        })
      }
    }

    if (newTags.length > 0) {
      insertedTags = tagRepo.getOrCreateTags(newTags as unknown as TagModel[]) // not exactly safe...
      processedTags.push(...insertedTags)
    }

    const tagIds = processedTags.map(tag => tag.id)
    const resolvedTagIds = tagRepo.getAllAncestors(tagIds)

    // Add tags to images in the junction table
    if (resolvedImageIds.length > 0) {
      tagRepo.addTagsToImages(tagIds, resolvedImageIds)
    }

    const allAddedTags = resolvedTagIds
      .map(id => tagRepo.getTagById(id))
      .filter((t): t is TagModel => !!t)

    console.log(
      `Successfully added ${allAddedTags.length} tags (including ancestors) to ${resolvedImageIds.length} images`,
    )

    return allAddedTags
  } catch (error) {
    console.error('Error adding tags:', error)
    throw error
  }
}
