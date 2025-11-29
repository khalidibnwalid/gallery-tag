import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFolderDialog: () => Promise<string | null>
      getImageFiles: (folderPath: string) => Promise<string[]>
      closeApp: () => void
    }
  }
}
