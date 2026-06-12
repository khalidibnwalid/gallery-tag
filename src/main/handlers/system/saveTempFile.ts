import { app } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'

export default async function saveTempFileHandler(
  _event: Electron.IpcMainInvokeEvent,
  base64Data: string,
  fileName?: string,
): Promise<string> {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
  let buffer: Buffer
  let extension = ''

  if (matches && matches.length === 3) {
    const type = matches[1]
    extension = type.split('/')[1] || ''
    buffer = Buffer.from(matches[2], 'base64')
  } else {
    buffer = Buffer.from(base64Data, 'base64')
  }

  const tempDir = app.getPath('temp')
  let finalFileName = fileName
  if (!finalFileName) {
    const suffix = extension ? `.${extension}` : ''
    finalFileName = `tmp_file_${Date.now()}${suffix}`
  }
  const filePath = join(tempDir, finalFileName)

  writeFileSync(filePath, buffer)
  return filePath
}
