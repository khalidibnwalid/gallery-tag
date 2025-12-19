import { shell } from 'electron'

const openPathInDefaultAppHandler = async (
  _: Electron.IpcMainInvokeEvent,
  filePath: string,
): Promise<void> => {
  await shell.openPath(filePath)
}

export default openPathInDefaultAppHandler
