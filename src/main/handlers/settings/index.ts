import { registerCoreHandlers } from './core'
import { registerThumbnailHandlers } from './thumbnail'
import { registerClipHandlers } from './clip'

export function registerSettingsHandlers() {
  registerCoreHandlers()
  registerThumbnailHandlers()
  registerClipHandlers()
}
