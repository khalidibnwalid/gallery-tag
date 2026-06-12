import { dialog } from 'electron'

export default async function openFileDialogHandler() {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: 'Select Search Image',
    filters: [
      {
        name: 'Images',
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'],
      },
    ],
  })

  if (!result.canceled && result.filePaths.length > 0)
    return result.filePaths[0]

  return null
}
