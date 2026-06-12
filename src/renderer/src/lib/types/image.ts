import { ImageModel } from '@main/types/models.shared'

export type ImageData = ImageModel & {
  tags?: string
  ai_distance?: number
}
