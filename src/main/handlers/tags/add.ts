import { TagModel } from '@main/types/models.shared'
import { db } from '@main/utils/repositories/db'
import { TagRepository } from '@main/utils/repositories/tag'

export default async function addHandler(
  _event: Electron.IpcMainInvokeEvent,
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
    console.log(`Adding tags to ${imagesIds?.length || 0} images`)

    // const database = db.getDatabase(db.getConnectedPaths()[0])

    const database = db.getFirstDatabase()
    if (!database)
      throw new Error(
        'No active database connection found. Please load a folder first.',
      )

    const tagRepo = new TagRepository(database)

    let newTags: Pick<TagModel, 'name' | 'color'>[] = []
    let processedTags: TagModel[] = []
    let insertedTags: TagModel[] = []

    for (const tag of tags) {
      // if exists, use it
      if ('id' in tag) {
        processedTags.push(tag as TagModel)
      } else {
        newTags.push({ name: tag.name.trim(), color: tag.color })
      }
    }

    if (newTags.length > 0) {
      insertedTags = tagRepo.getOrCreateTags(newTags as unknown as TagModel[]) // not exactly safe...
      processedTags.push(...insertedTags)
    }

    const tagIds = processedTags.map(tag => tag.id)

    // Add tags to images in the junction table
    if (imagesIds && imagesIds.length > 0)
      tagRepo.addTagsToImages(tagIds, imagesIds)

    console.log(
      `Successfully added ${tagIds.length} tags to ${imagesIds?.length || 0} images`,
    )

    return processedTags
  } catch (error) {
    console.error('Error adding tags:', error)
    throw error
  }
}
