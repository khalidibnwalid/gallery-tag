import { registerImagesHandlers } from './images'
import { registerSystemHandlers } from './system'
import { registerTagsHandlers } from './tags'

export function registerAllHandlers() {
  registerSystemHandlers()
  registerImagesHandlers()
  registerTagsHandlers()
}
