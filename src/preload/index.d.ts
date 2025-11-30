import { ElectronAPI } from '@electron-toolkit/preload'
import { ImageModel } from '@main/types/models.shared'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFolderDialog: () => Promise<string | null>
      getImageFiles: (folderPath: string) => Promise<ImageModel[]>
      closeApp: () => void
    }
  }
}
