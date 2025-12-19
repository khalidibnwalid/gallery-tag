import { dialog } from 'electron'

export default async function openFolderDialogHandler() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Image Folder',
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }

  return null
}
