import { shell } from 'electron'

const revealInFileExplorerHandler = async (
  _: Electron.IpcMainInvokeEvent,
  filePath: string,
): Promise<void> => {
  shell.showItemInFolder(filePath)
}

export default revealInFileExplorerHandler
