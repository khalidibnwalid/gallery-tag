import { registerImagesHandlers } from './images'
import { registerSystemHandlers } from './system'
import { registerTagsHandlers } from './tags'
import { registerFoldersHandlers } from './folders'

export function registerAllHandlers() {
  registerSystemHandlers()
  registerImagesHandlers()
  registerTagsHandlers()
  registerFoldersHandlers()
}
