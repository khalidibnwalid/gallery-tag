import { shell } from 'electron'

/**
 * Safely moves a file to the OS system trash.
 */
export async function deleteFileToTrash(filePath: string): Promise<void> {
  await shell.trashItem(filePath)
}
