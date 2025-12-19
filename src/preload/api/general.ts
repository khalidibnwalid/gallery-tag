import { EVENTS } from '@main/types/constants.shared'
import { Notifier } from '@main/types/models.shared'
import { ipcRenderer, IpcRendererEvent } from 'electron'

const generalApi = {
  onNotify: (callback: (notifier: Notifier<unknown>) => void) => {
    const sub = (_: IpcRendererEvent, data: { payload: Notifier<unknown> }) =>
      callback(data.payload)
    ipcRenderer.on(EVENTS.NOTIFY, sub)
    return () => ipcRenderer.removeListener(EVENTS.NOTIFY, sub)
  },
}

export default generalApi
