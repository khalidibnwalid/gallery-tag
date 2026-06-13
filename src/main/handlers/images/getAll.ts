import { clipService } from '@main/services/clip.service'
import { SearchFilter } from '@main/types/api.shared'
import { ImageModel, PaginatedResult } from '@main/types/models.shared'
import { CONFIG_DIR, getAndInitConfig } from '@main/utils/files/config'
import { FolderRepository } from '@main/utils/repositories/Folder'
import { ImageRepository } from '@main/utils/repositories/Image'
import { EXTENSIONS, getFilesByExtension } from '@main/utils/files/getFiles'
import { join } from 'path'
import {
  scanNewFiles,
  scanHashes,
  scanColors,
  scanEmbeddings,
  scanExif,
} from '@main/utils/files/scan'
import { runExclusiveSync } from '../../utils/locks'
import { watcherService } from '@main/services/watcher.service'

async function getAllBase(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  offset?: number,
  size?: number,
  filter?: SearchFilter,
): Promise<
  | PaginatedResult<ImageModel & { tags?: string }>
  | { data: (ImageModel & { tags?: string })[]; total: number }
> {
  try {
    const sender = event.sender
    const isPaginated = offset !== undefined && size !== undefined

    console.log(
      isPaginated
        ? `Getting paginated images for folder: ${folderPath}, offset: ${offset}, size: ${size}, filter: ${JSON.stringify(filter)}`
        : `Scanning folder: ${folderPath}`,
    )

    const { db } = await getAndInitConfig(folderPath)
    const folderRepo = new FolderRepository(db, folderPath)
    const imageRepo = new ImageRepository(db, folderPath)

    // Sync CLIP model selection from persisted settings before any embedding work
    clipService.loadSettingsFromDb(db)

    // Start watching the active folder for changes
    watcherService.watchFolder(folderPath, sender).catch(err => {
      console.error('Failed to start folder watcher:', err)
    })

    await runExclusiveSync(folderPath, async () => {
      await folderRepo.syncFoldersFromDisk(folderPath)

      const imageFiles = await getFilesByExtension(
        folderPath,
        EXTENSIONS.IMAGES,
        CONFIG_DIR,
      )

      const currentPaths = imageFiles.map(file => file.fullPath)

      // Mark missing images as soft-deleted
      const numSoftDeleted = imageRepo.markMissingImagesAsDeleted(currentPaths)
      if (numSoftDeleted > 0) {
        console.log(`Soft-deleted ${numSoftDeleted} missing images`)
      }

      // Purge deleted images older than 30 days
      const numPurged = imageRepo.purgeExpiredDeletedImages()
      if (numPurged > 0) {
        console.log(
          `Purged ${numPurged} expired soft-deleted images from database`,
        )
      }

      // 0. Same-path recovery: soft-deleted images whose file still exists at the
      const softDeletedAtCurrentPaths =
        imageRepo.getSoftDeletedImagesAtPaths(currentPaths)
      if (softDeletedAtCurrentPaths.length > 0) {
        const currentFileMap = new Map(imageFiles.map(f => [f.fullPath, f]))
        for (const img of softDeletedAtCurrentPaths) {
          const fileInfo = currentFileMap.get(img.filePath)
          if (fileInfo) {
            imageRepo.recoverImage(img.id, fileInfo)
            console.log(`Same-path recovery: ${img.filePath}`)
          }
        }
        console.log(
          `Recovered ${softDeletedAtCurrentPaths.length} same-path soft-deleted images`,
        )
      }

      // 1. Process new files (recovery & thumbnail generation)
      await scanNewFiles(
        imageRepo,
        sender,
        folderPath,
        imageFiles,
        currentPaths,
        db,
      )

      // 4. Background: Backfill hashes for existing images (limit 50 per scan to avoid performance hit)
      scanHashes(imageRepo)

      // 5. Background: Backfill dominant colors for existing images (limit 50 per scan)
      scanColors(imageRepo)

      // 6. Background: Backfill EXIF metadata for existing images (limit 50 per scan)
      scanExif(imageRepo)

      // 7. Background: Compute CLIP embeddings for unembedded images
      scanEmbeddings(imageRepo, folderPath)
    })

    let aiEmbedding: Float32Array | undefined = undefined
    if (filter?.aiSearchText) {
      console.log(`AI Text Search: "${filter.aiSearchText}"`)
      await clipService.init(join(folderPath, CONFIG_DIR))
      aiEmbedding = await clipService.getTextEmbedding(filter.aiSearchText)
    } else if (filter?.aiSearchImage) {
      console.log(`AI Image Search: "${filter.aiSearchImage}"`)
      await clipService.init(join(folderPath, CONFIG_DIR))
      aiEmbedding = await clipService.getImageEmbedding(filter.aiSearchImage)
    }

    if (isPaginated) {
      const { data: images, total } = imageRepo.getAllImagesWithTagsPaginated(
        offset!,
        size!,
        filter,
        aiEmbedding,
      )
      const hasMore = offset! + size! < total

      console.log(
        `Returning ${images.length} image paths (${offset}-${offset! + size! - 1} of ${total})`,
      )

      return {
        data: images,
        pagination: {
          offset: offset!,
          size: size!,
          total,
          hasMore,
        },
      }
    } else {
      // get all image paths from database (after update and delete)
      const result = imageRepo.getAllImagesWithTags()

      console.log(`Returning ${result.total} image paths`)
      return result
    }
  } catch (error) {
    console.error('Error getting image files:', error)

    if (offset !== undefined && size !== undefined) {
      return {
        data: [],
        pagination: {
          offset,
          size,
          total: 0,
          hasMore: false,
        },
      }
    } else {
      return { data: [], total: 0 }
    }
  }
}

export default async function getAllHandler(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
): Promise<{ data: (ImageModel & { tags?: string })[]; total: number }> {
  return (await getAllBase(event, folderPath)) as {
    data: (ImageModel & { tags?: string })[]
    total: number
  }
}

export async function getPaginatedHandler(
  event: Electron.IpcMainInvokeEvent,
  folderPath: string,
  offset: number = 0,
  size: number = 50,
  filter?: SearchFilter,
): Promise<PaginatedResult<ImageModel & { tags?: string }>> {
  return (await getAllBase(
    event,
    folderPath,
    offset,
    size,
    filter,
  )) as PaginatedResult<ImageModel & { tags?: string }>
}
