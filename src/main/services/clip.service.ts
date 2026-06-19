import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  RawImage,
  env,
  PretrainedProcessorOptions,
  PretrainedModelOptions,
  SiglipVisionModel,
  SiglipTextModel,
  Processor,
  PreTrainedTokenizer,
} from '@huggingface/transformers'
import { join } from 'path'
import { notifier } from './notifier.service'
import {
  NOTIFIER_EVENTS,
  NOTIFIER_EVENT_TYPES,
} from '@main/types/constants.shared'
import { AppSettingsRepository } from '@main/utils/repositories/appSettings'
import {
  APP_SETTING_KEYS,
  CLIP_DEFAULT_MODEL,
  CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT,
  CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT,
  CLIP_AVAILABLE_MODELS_DEFAULT,
  ClipModelConfig,
} from '@main/utils/appSettingsKeys'
import Database from 'better-sqlite3'

export function normalize(vector: Float32Array): Float32Array {
  let sum = 0
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i]
  }
  const magnitude = Math.sqrt(sum)
  if (magnitude === 0) return vector
  const normalized = new Float32Array(vector.length)
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / magnitude
  }
  return normalized
}

class ClipService {
  private processor: Processor | null = null
  private visionModel: CLIPVisionModelWithProjection | null = null
  private tokenizer: PreTrainedTokenizer | null = null
  private textModel: CLIPTextModelWithProjection | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null
  private modelName = CLIP_DEFAULT_MODEL
  private modelDimension = 512
  private modelProcessor: string | null = null

  loadSettingsFromDb(db: Database.Database): void {
    const repo = new AppSettingsRepository(db)

    const savedModel = repo.getParsedValue<string>(
      APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
    )
    if (savedModel && savedModel !== this.modelName) {
      console.log(
        `[CLIP] Model changed from "${this.modelName}" → "${savedModel}". Will reinitialise.`,
      )
      this.modelName = savedModel
      // Force reinitialisation so the new model is loaded on the next init() call
      this.initialized = false
      this.initPromise = null
      this.processor = null
      this.visionModel = null
      this.tokenizer = null
      this.textModel = null
    }

    const modelsConfig = (repo.getParsedValue<any[]>(
      APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
    ) || CLIP_AVAILABLE_MODELS_DEFAULT) as ClipModelConfig[]
    const matchedModel = modelsConfig.find(m => m.id === this.modelName)
    this.modelDimension = matchedModel ? matchedModel.dimension : 512
    this.modelProcessor = matchedModel?.processor || null
  }

  /**
   * Persist a new model selection to the database and schedule a reinitialisation.
   */
  setModel(db: Database.Database, modelId: string): void {
    const repo = new AppSettingsRepository(db)
    repo.setSetting(APP_SETTING_KEYS.CLIP_CURRENT_MODEL, modelId, 'string')
    this.loadSettingsFromDb(db)
  }

  /**
   * Returns the text-to-image similarity threshold from settings (or hardcoded default).
   */
  getTextToImageThreshold(db?: Database.Database): number {
    if (!db) return CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT
    const repo = new AppSettingsRepository(db)
    return (
      repo.getParsedValue<number>(
        APP_SETTING_KEYS.CLIP_TEXT_TO_IMAGE_THRESHOLD,
      ) ?? CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT
    )
  }

  /**
   * Returns the image-to-image similarity threshold from settings (or hardcoded default).
   */
  getImageToImageThreshold(db?: Database.Database): number {
    if (!db) return CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT
    const repo = new AppSettingsRepository(db)
    return (
      repo.getParsedValue<number>(
        APP_SETTING_KEYS.CLIP_IMAGE_TO_IMAGE_THRESHOLD,
      ) ?? CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT
    )
  }

  isInitialized(): boolean {
    return this.initialized
  }

  getEmbeddingDimension(): number {
    return this.modelDimension
  }

  getModelName(): string {
    return this.modelName
  }

  getVectorTableName(): string {
    return 'vec_images_' + this.modelName.replace(/[^a-zA-Z0-9_]/g, '_')
  }

  async init(cacheDir: string): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const originalToken = process.env.HF_TOKEN
      const originalTokenLower = process.env.hf_token
      const originalAccessToken = process.env.HF_ACCESS_TOKEN
      const originalAccessTokenLower = process.env.hf_access_token
      const originalApiToken = process.env.HF_API_TOKEN
      const originalApiTokenLower = process.env.hf_api_token

      try {
        // Configure local storage for models within the workspace config directory
        env.cacheDir = join(cacheDir, 'models')
        env.allowLocalModels = true

        console.log(
          'HF env keys before delete:',
          Object.keys(process.env).filter(k =>
            k.toUpperCase().startsWith('HF_'),
          ),
        )
        // Temporarily remove HF tokens to prevent 401/403 errors on public repositories
        delete process.env.HF_TOKEN
        delete process.env.hf_token
        delete process.env.HF_ACCESS_TOKEN
        delete process.env.hf_access_token
        delete process.env.HF_API_TOKEN
        delete process.env.hf_api_token

        // Override env.fetch to clean up Authorization header for public HF requests
        const originalFetch = env.fetch
        env.fetch = async (url: string | URL, options?: unknown) => {
          const urlStr = String(url)
          console.log(`[CLIP Fetch] Fetching: ${urlStr}`)

          let cleanOptions = options as RequestInit | undefined
          if (cleanOptions && cleanOptions.headers) {
            let headersObj: Headers | null = null
            if (cleanOptions.headers instanceof Headers) {
              headersObj = cleanOptions.headers
            } else if (typeof cleanOptions.headers === 'object') {
              headersObj = new Headers(
                cleanOptions.headers as Record<string, string>,
              )
            }

            if (headersObj) {
              const headerKeys = Array.from(headersObj.keys())
              console.log(`[CLIP Fetch] Header keys: ${headerKeys.join(', ')}`)

              if (headersObj.has('Authorization')) {
                console.log(
                  `[CLIP Fetch] Stripping Authorization header for public Hugging Face request`,
                )
                headersObj.delete('Authorization')
                cleanOptions = { ...cleanOptions, headers: headersObj }
              }
            }
          }

          try {
            const res = await originalFetch(url, cleanOptions)
            console.log(
              `[CLIP Fetch] Response: ${res.status} ${res.statusText}`,
            )
            return res
          } catch (err) {
            console.error(`[CLIP Fetch] Fetch error:`, err)
            throw err
          }
        }

        console.log(`Loading CLIP model '${this.modelName}' in main process...`)
        notifier.notify({
          id: NOTIFIER_EVENTS.CLIP.STATUS,
          type: NOTIFIER_EVENT_TYPES.STATUS,
          payload: { status: 'loading' },
        })

        const isSiglip = this.modelName.includes('siglip')

        const processorModelName = this.modelProcessor || this.modelName

        this.processor = await AutoProcessor.from_pretrained(
          processorModelName,
          {
            token: null,
          } as PretrainedProcessorOptions & { token: string | null },
        )

        if (isSiglip) {
          this.visionModel = await SiglipVisionModel.from_pretrained(
            this.modelName,
            {
              dtype: 'q8',
              token: null,
            } as PretrainedModelOptions & { token: string | null },
          )
        } else {
          this.visionModel =
            await CLIPVisionModelWithProjection.from_pretrained(
              this.modelName,
              {
                dtype: 'q8',
                token: null,
              } as PretrainedModelOptions & { token: string | null },
            )
        }

        this.tokenizer = await AutoTokenizer.from_pretrained(this.modelName, {
          token: null,
        } as PretrainedProcessorOptions & { token: string | null })

        if (isSiglip) {
          this.textModel = await SiglipTextModel.from_pretrained(
            this.modelName,
            {
              dtype: 'q8',
              token: null,
            } as PretrainedModelOptions & { token: string | null },
          )
        } else {
          this.textModel = await CLIPTextModelWithProjection.from_pretrained(
            this.modelName,
            {
              dtype: 'q8',
              token: null,
            } as PretrainedModelOptions & { token: string | null },
          )
        }

        this.initialized = true
        console.log('CLIP models loaded successfully')
        notifier.notify({
          id: NOTIFIER_EVENTS.CLIP.STATUS,
          type: NOTIFIER_EVENT_TYPES.STATUS,
          payload: { status: 'ready' },
        })
      } catch (error) {
        console.error('Failed to initialize CLIP service:', error)
        this.initPromise = null
        notifier.notify({
          id: NOTIFIER_EVENTS.CLIP.STATUS,
          type: NOTIFIER_EVENT_TYPES.STATUS,
          payload: {
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          },
        })
        throw error
      } finally {
        // Restore the original token environment variables
        if (originalToken !== undefined) process.env.HF_TOKEN = originalToken
        if (originalTokenLower !== undefined)
          process.env.hf_token = originalTokenLower
        if (originalAccessToken !== undefined)
          process.env.HF_ACCESS_TOKEN = originalAccessToken
        if (originalAccessTokenLower !== undefined)
          process.env.hf_access_token = originalAccessTokenLower
        if (originalApiToken !== undefined)
          process.env.HF_API_TOKEN = originalApiToken
        if (originalApiTokenLower !== undefined)
          process.env.hf_api_token = originalApiTokenLower
      }
    })()

    return this.initPromise
  }

  async getImageEmbedding(imagePath: string): Promise<Float32Array> {
    if (!this.initialized || !this.processor || !this.visionModel) {
      throw new Error('CLIP service not initialized')
    }
    const image = await RawImage.read(imagePath)
    const imageInputs = await this.processor(image)
    const outputs = await this.visionModel(imageInputs)
    const embeds = outputs.image_embeds || outputs.pooler_output
    if (!embeds) {
      throw new Error('No image embeddings found in model output')
    }
    return normalize(embeds.data)
  }

  async getTextEmbedding(text: string): Promise<Float32Array> {
    if (!this.initialized || !this.tokenizer || !this.textModel) {
      throw new Error('CLIP service not initialized')
    }
    const textInputs = await this.tokenizer([text], {
      padding: this.modelName.includes('siglip') ? 'max_length' : true,
      truncation: true,
    })
    const outputs = await this.textModel(textInputs)
    const embeds = outputs.text_embeds || outputs.pooler_output
    if (!embeds) {
      throw new Error('No text embeddings found in model output')
    }
    return normalize(embeds.data)
  }
}

export const clipService = new ClipService()
