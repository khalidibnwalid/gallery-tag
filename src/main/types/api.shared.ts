import { ImageModel } from './models.shared'

type ImageUpdate = (Pick<ImageModel, 'id'> | Pick<ImageModel, 'filePath'>) &
  Partial<ImageModel>

export interface ImageUpdatePayload {
  images: ImageUpdate[]
}
