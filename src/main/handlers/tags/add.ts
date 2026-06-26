import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

import { join } from 'path'

export default async function addHandler(
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  {
    tags,
    imagesIds,
  }: {
    tags: (TagModel | Pick<TagModel, 'name' | 'color'>)[]
    imagesIds?: number[]
  },
): Promise<TagModel[]> {
  if (!tags || tags.length === 0 || tags.some(tag => !tag.name)) return []
  try {
    console.log(
      `Adding tags to ${imagesIds?.length || 0} images for folder: ${folderPath}`,
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
    if (imagesIds && imagesIds.length > 0) {
      tagRepo.addTagsToImages(tagIds, imagesIds)
    }

    const allAddedTags = resolvedTagIds
      .map(id => tagRepo.getTagById(id))
      .filter((t): t is TagModel => !!t)

    console.log(
      `Successfully added ${allAddedTags.length} tags (including ancestors) to ${imagesIds?.length || 0} images`,
    )

    return allAddedTags
  } catch (error) {
    console.error('Error adding tags:', error)
    throw error
  }
}
