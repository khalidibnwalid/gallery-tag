import { EVENTS } from '@main/types/constants.shared'
import { BrowserWindow } from 'electron'
import { Notifier } from '../types/models.shared'

export class NotifierService {
  private static instance: NotifierService
  private mainWindow: BrowserWindow | null = null

  private constructor() {}

  public static getInstance(): NotifierService {
    if (!NotifierService.instance) {
      NotifierService.instance = new NotifierService()
    }
    return NotifierService.instance
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  public notify<T>({ id, type, payload }: Notifier<T>): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn(
        'NotifierService: No main window set or window is destroyed, cannot send notification',
      )
      return
    }

    if (this.mainWindow.webContents.isDestroyed()) {
      console.warn(
        'NotifierService: webContents has been destroyed, cannot send notification',
      )
      return
    }

    const reporter: Notifier<T> = {
      id,
      type,
      payload,
    }

    this.mainWindow.webContents.send(EVENTS.NOTIFY, { payload: reporter })
  }
}

// singleton
export const notifier = NotifierService.getInstance()
