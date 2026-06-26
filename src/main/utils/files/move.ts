import fs from 'fs/promises'

export async function moveFile(
  source: string,
  destination: string,
): Promise<void> {
  try {
    await fs.rename(source, destination)
  } catch (error: unknown) {
    if ((error as { code: string }).code === 'EXDEV') {
      await fs.copyFile(source, destination)
      await fs.unlink(source)
    } else {
      throw error
    }
  }
}
