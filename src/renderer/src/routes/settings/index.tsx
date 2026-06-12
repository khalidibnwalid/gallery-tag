import { createFileRoute } from '@tanstack/react-router'
import { useFolder } from '@/components/providers/FolderProvider'
import { useQueryClient } from '@tanstack/react-query'
import { NoFolderLanding } from '../-components/NoFolderLanding'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  GearIcon,
  CaretDownIcon,
  CheckIcon,
  ArrowClockwiseIcon,
  InfoIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  APP_SETTING_KEYS,
  CLIP_AVAILABLE_MODELS_DEFAULT,
  CLIP_DEFAULT_MODEL,
  CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT,
  CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT,
  THUMBNAIL_QUALITY_DEFAULT,
  ClipModelConfig,
} from '@/lib/types/appSettingsKeys'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/settings/')({
  component: ComponentPage,
})

function ComponentPage() {
  const { folderPath } = useFolder()

  if (!folderPath) {
    return (
      <div className="flex h-full overflow-hidden justify-center items-center">
        <ScrollArea className="flex-1 h-full">
          <div className="p-6 pt-20 pb-24">
            <NoFolderLanding />
          </div>
        </ScrollArea>
      </div>
    )
  }

  return <SettingsContent folderPath={folderPath} />
}

function SettingsContent({ folderPath }: { folderPath: string }) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Navigation Panel */}
      <div className="w-64 border-r border-border/40 p-6 pt-20 hidden md:flex flex-col gap-1 bg-card/10">
        <div className="px-3 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </h2>
        </div>

        <Button
          // variant={isSelected ? 'secondary' : 'ghost'}
          variant="ghost"
          className={cn(
            'w-full justify-start h-9 pr-3 text-sm font-semibold rounded-md transition-all duration-150',
            'bg-primary! text-primary-foreground',
          )}
          // style={{ paddingLeft: `${level * 16 + 8}px` }}
          // onClick={() => onSelect?.(node.path)}
        >
          <GearIcon className="size-5" weight="fill" />
          General
        </Button>
      </div>

      {/* Right Content Panel */}
      <ScrollArea className="flex-1 h-full">
        <div className="p-6 pt-20 pb-24 max-w-3xl mx-auto space-y-8 animate-fade-in">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage your gallery preferences, image compression quality, and AI
              model search parameters.
            </p>
          </div>

          <hr className="border-border/60" />

          {/* Modularized Components */}
          <ThumbnailSettingsCard folderPath={folderPath} />
          <AiSearchSettingsCard folderPath={folderPath} />
        </div>
      </ScrollArea>
    </div>
  )
}

/* ==========================================
   Thumbnail Settings Component
   ========================================== */
function ThumbnailSettingsCard({ folderPath }: { folderPath: string }) {
  const [loading, setLoading] = useState(true)
  const [thumbnailQuality, setThumbnailQuality] = useState<number | null>(null)
  const [localQuality, setLocalQuality] = useState<number>(90)
  const [isRegenerating, setIsRegenerating] = useState(false)

  useEffect(() => {
    async function loadThumbnailSettings() {
      if (!window.api?.settings) return
      try {
        setLoading(true)
        const quality = await window.api.settings.getValue<number | null>(
          APP_SETTING_KEYS.THUMBNAIL_QUALITY,
        )
        const qualVal =
          quality !== undefined ? quality : THUMBNAIL_QUALITY_DEFAULT
        setThumbnailQuality(qualVal)
        setLocalQuality(qualVal !== null ? qualVal : 90)
      } catch (err) {
        console.error('Failed to load thumbnail settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadThumbnailSettings()
  }, [folderPath])

  const updateThumbnailQuality = async (val: number | null) => {
    if (!window.api?.settings) return
    try {
      setThumbnailQuality(val)
      await window.api.settings.set(
        APP_SETTING_KEYS.THUMBNAIL_QUALITY,
        val,
        'number',
      )
    } catch (e) {
      console.error(e)
      toast.error('Failed to save thumbnail quality.')
    }
  }

  const queryClient = useQueryClient()

  const handleRegenerateThumbnails = async () => {
    if (!window.api?.settings || !folderPath) return
    try {
      setIsRegenerating(true)
      const count = await window.api.settings.regenerateThumbnails(folderPath)
      queryClient.invalidateQueries({ queryKey: ['images'] })
      toast.success(
        `Started thumbnail regeneration for ${count} images in the background.`,
      )
    } catch (e) {
      console.error(e)
      toast.error('Failed to trigger thumbnail regeneration.')
    } finally {
      setIsRegenerating(false)
    }
  }

  const isLossless = thumbnailQuality === null

  if (loading) {
    return (
      <div className="border border-border/40 bg-card/20 backdrop-blur-md rounded-2xl p-6 h-48 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="size-6 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">
            Loading thumbnail settings...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border/40 bg-card/20 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xs">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">
          Thumbnails Quality
        </h2>
        <p className="text-sm text-muted-foreground">
          Set WebP quality parameters for local image previews. Lossless is
          sharper but uses more disk space.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-bold text-foreground">
              Lossless (Full Quality)
            </span>
            <p className="text-xs text-muted-foreground">
              Ignore quality levels and generate full-fidelity thumbnails.
            </p>
          </div>
          <Switch
            checked={isLossless}
            onCheckedChange={checked => {
              if (checked) {
                updateThumbnailQuality(null)
              } else {
                updateThumbnailQuality(localQuality)
              }
            }}
          />
        </div>

        <div
          className={cn(
            'space-y-2 transition-opacity duration-200',
            isLossless && 'opacity-40 pointer-events-none',
          )}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">
              WebP Compression Quality
            </span>
            <div className="flex items-center gap-1 font-mono text-sm">
              <input
                type="number"
                value={localQuality}
                min={1}
                max={100}
                step={1}
                onChange={e => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) {
                    setLocalQuality(val)
                    updateThumbnailQuality(val)
                  }
                }}
                className="w-12 text-right bg-transparent text-primary font-bold outline-none border-b border-border focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
          <Slider
            value={[localQuality]}
            disabled={isLossless}
            min={1}
            max={100}
            step={1}
            onValueChange={val => setLocalQuality(val[0])}
            onPointerUp={() => updateThumbnailQuality(localQuality)}
            onMouseUp={() => updateThumbnailQuality(localQuality)}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-md">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <InfoIcon className="size-4 text-muted-foreground" />
            Regenerate existing thumbnails
          </span>
          <p className="text-xs text-muted-foreground">
            Update previously generated preview files to match the new quality
            setting.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={isRegenerating}
          onClick={handleRegenerateThumbnails}
          className="shrink-0"
        >
          {isRegenerating ? (
            <Spinner className="mr-2" />
          ) : (
            <ArrowClockwiseIcon className="size-4 mr-2" />
          )}
          Regenerate Thumbnails
        </Button>
      </div>
    </div>
  )
}

/* ==========================================
   AI Search Settings Component
   ========================================== */
function AiSearchSettingsCard({ folderPath }: { folderPath: string }) {
  const [loading, setLoading] = useState(true)
  const [clipModels, setClipModels] = useState<ClipModelConfig[]>([])
  const [currentModel, setCurrentModel] = useState<string>('')
  const [localTextThreshold, setLocalTextThreshold] = useState<number>(0.2)
  const [localImageThreshold, setLocalImageThreshold] = useState<number>(0.6)
  const [isReindexing, setIsReindexing] = useState(false)

  const [isAddingModel, setIsAddingModel] = useState(false)
  const [newModelId, setNewModelId] = useState('')
  const [newModelDim, setNewModelDim] = useState<number>(512)

  useEffect(() => {
    async function loadAiSearchSettings() {
      if (!window.api?.settings) return
      try {
        setLoading(true)
        const models = await window.api.settings.getValue<ClipModelConfig[]>(
          APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
        )
        const current = await window.api.settings.getValue<string>(
          APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
        )
        const textThresh = await window.api.settings.getValue<number>(
          APP_SETTING_KEYS.CLIP_TEXT_TO_IMAGE_THRESHOLD,
        )
        const imgThresh = await window.api.settings.getValue<number>(
          APP_SETTING_KEYS.CLIP_IMAGE_TO_IMAGE_THRESHOLD,
        )

        const mergedModels = [...(models || [])]
        let hasNewDefault = false
        for (const defModel of CLIP_AVAILABLE_MODELS_DEFAULT) {
          if (!mergedModels.some(m => m.id === defModel.id)) {
            mergedModels.push(defModel)
            hasNewDefault = true
          }
        }
        setClipModels(mergedModels)
        if (hasNewDefault || !models) {
          await window.api.settings.set(
            APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
            mergedModels,
            'json_array',
          )
        }
        setCurrentModel(current || CLIP_DEFAULT_MODEL)

        const textVal =
          textThresh !== undefined
            ? textThresh
            : CLIP_TEXT_TO_IMAGE_THRESHOLD_DEFAULT
        const imgVal =
          imgThresh !== undefined
            ? imgThresh
            : CLIP_IMAGE_TO_IMAGE_THRESHOLD_DEFAULT

        setLocalTextThreshold(textVal)
        setLocalImageThreshold(imgVal)
      } catch (err) {
        console.error('Failed to load AI settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAiSearchSettings()
  }, [folderPath])

  const queryClient = useQueryClient()

  const updateCurrentModel = async (model: string) => {
    if (!window.api?.settings) return
    try {
      setCurrentModel(model)
      await window.api.settings.set(
        APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
        model,
        'string',
      )
      queryClient.invalidateQueries({ queryKey: ['images'] })
      toast.success(`Active AI model set to ${model.split('/').pop()}`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to update active AI model.')
    }
  }

  const handleAddCustomModel = async () => {
    if (!window.api?.settings || !newModelId.trim() || !newModelDim) return
    try {
      const trimmedId = newModelId.trim()
      const exists = clipModels.some(
        m => m.id.toLowerCase() === trimmedId.toLowerCase(),
      )
      if (exists) {
        toast.error('Model ID already exists.')
        return
      }

      const newModel: ClipModelConfig = {
        id: trimmedId,
        name: trimmedId,
        dimension: newModelDim,
      }

      const updatedModels = [...clipModels, newModel]
      setClipModels(updatedModels)
      await window.api.settings.set(
        APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
        updatedModels,
        'json_array',
      )

      await updateCurrentModel(newModel.id)

      setNewModelId('')
      setNewModelDim(512)
      setIsAddingModel(false)
      toast.success('Custom model added successfully!')
    } catch (e) {
      console.error(e)
      toast.error('Failed to add custom model.')
    }
  }

  const updateTextThreshold = async (val: number) => {
    if (!window.api?.settings) return
    try {
      await window.api.settings.set(
        APP_SETTING_KEYS.CLIP_TEXT_TO_IMAGE_THRESHOLD,
        val,
        'number',
      )
      queryClient.invalidateQueries({ queryKey: ['images', 'paginated'] })
    } catch (e) {
      console.error(e)
      toast.error('Failed to save text threshold.')
    }
  }

  const updateImageThreshold = async (val: number) => {
    if (!window.api?.settings) return
    try {
      await window.api.settings.set(
        APP_SETTING_KEYS.CLIP_IMAGE_TO_IMAGE_THRESHOLD,
        val,
        'number',
      )
      queryClient.invalidateQueries({ queryKey: ['images', 'paginated'] })
    } catch (e) {
      console.error(e)
      toast.error('Failed to save image threshold.')
    }
  }

  const handleReindexClip = async () => {
    if (!window.api?.settings || !folderPath) return
    try {
      setIsReindexing(true)
      const cleared = await window.api.settings.reindexImagesClip(folderPath)
      queryClient.invalidateQueries({ queryKey: ['images'] })
      toast.success(
        `Started AI re-indexing for ${cleared} images in the background.`,
      )
    } catch (e) {
      console.error(e)
      toast.error('Failed to trigger AI re-indexing.')
    } finally {
      setIsReindexing(false)
    }
  }

  if (loading) {
    return (
      <div className="border border-border/40 bg-card/20 backdrop-blur-md rounded-2xl p-6 h-64 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="size-6 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">
            Loading AI settings...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border/40 bg-card/20 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xs">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">AI Image Search</h2>
        <p className="text-sm text-muted-foreground">
          Configure local CLIP AI model criteria and similarity matching
          thresholds.
        </p>
      </div>

      <div className="space-y-6">
        {/* Model Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-0.5 pt-1">
            <span className="text-sm font-bold text-foreground">
              CLIP Model Identifier
            </span>
            <p className="text-xs text-muted-foreground">
              Model used to scan files. Larger models are more accurate but run
              slower.
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-72 justify-between font-mono text-xs text-left"
                >
                  <span className="truncate">
                    {currentModel || 'Select CLIP model'}
                  </span>
                  <CaretDownIcon className="size-4 opacity-50 shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 bg-background/90 backdrop-blur-md">
                {clipModels.map(model => (
                  <DropdownMenuItem
                    key={model.id}
                    onSelect={() => updateCurrentModel(model.id)}
                    className="font-mono text-xs cursor-pointer flex justify-between items-center"
                  >
                    <div className="flex flex-col text-left">
                      <span
                        className={cn(
                          'flex-1',
                          model.id === currentModel && 'font-bold text-primary',
                        )}
                      >
                        {model.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Dimension: {model.dimension}d
                      </span>
                    </div>
                    {model.id === currentModel && (
                      <CheckIcon className="size-4 text-primary shrink-0 ml-2 animate-fade-in" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="link"
              size="sm"
              className="text-xs p-0 h-auto font-semibold text-primary hover:no-underline hover:opacity-80"
              onClick={() => setIsAddingModel(!isAddingModel)}
            >
              {isAddingModel ? 'Cancel' : '+ Add custom CLIP model'}
            </Button>
          </div>
        </div>

        {/* Add Model Form */}
        {isAddingModel && (
          <div className="p-4 border border-border/40 rounded-xl bg-card/10 space-y-3 animate-fade-in">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Add Custom CLIP Model
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  HuggingFace Model ID
                </label>
                <Input
                  type="text"
                  size="sm"
                  placeholder="e.g. Xenova/clip-vit-large-patch14"
                  value={newModelId}
                  onValueChange={setNewModelId}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Dimension
                </label>
                <Input
                  type="number"
                  size="sm"
                  placeholder="e.g. 768"
                  value={newModelDim ? String(newModelDim) : ''}
                  onValueChange={val => setNewModelDim(parseInt(val) || 0)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCustomModel}
                disabled={!newModelId.trim() || !newModelDim}
                className="text-xs"
              >
                Add Model
              </Button>
            </div>
          </div>
        )}

        {/* Text-to-Image Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground">
                Text-to-Image Similarity Limit
              </span>
              <p className="text-xs text-muted-foreground">
                Matching strictness for search words. Higher matches are more
                relevant.
              </p>
            </div>
            <input
              type="number"
              value={localTextThreshold}
              min={0.0}
              max={1.0}
              step={0.001}
              onChange={e => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val)) {
                  setLocalTextThreshold(val)
                  updateTextThreshold(val)
                }
              }}
              className="w-16 text-right bg-transparent text-primary font-bold font-mono outline-none border-b border-border focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <Slider
            value={[localTextThreshold]}
            min={0.0}
            max={1.0}
            step={0.01}
            onValueChange={val => setLocalTextThreshold(val[0])}
            onPointerUp={() => updateTextThreshold(localTextThreshold)}
            onMouseUp={() => updateTextThreshold(localTextThreshold)}
          />
        </div>

        {/* Image-to-Image Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground">
                Image-to-Image Similarity Limit
              </span>
              <p className="text-xs text-muted-foreground">
                Strictness limit for finding visually similar photos.
              </p>
            </div>
            <input
              type="number"
              value={localImageThreshold}
              min={0.0}
              max={1.0}
              step={0.001}
              onChange={e => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val)) {
                  setLocalImageThreshold(val)
                  updateImageThreshold(val)
                }
              }}
              className="w-16 text-right bg-transparent text-primary font-bold font-mono outline-none border-b border-border focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <Slider
            value={[localImageThreshold]}
            min={0.0}
            max={1.0}
            step={0.01}
            onValueChange={val => setLocalImageThreshold(val[0])}
            onPointerUp={() => updateImageThreshold(localImageThreshold)}
            onMouseUp={() => updateImageThreshold(localImageThreshold)}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-md">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <SparkleIcon className="size-4 text-muted-foreground" />
            Re-index AI search library
          </span>
          <p className="text-xs text-muted-foreground">
            Wipes and re-evaluates all image features using the currently
            selected model.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={isReindexing}
          onClick={handleReindexClip}
          className="shrink-0"
        >
          {isReindexing ? (
            <Spinner className="mr-2" />
          ) : (
            <ArrowClockwiseIcon className="size-4 mr-2" />
          )}
          Re-index Gallery
        </Button>
      </div>
    </div>
  )
}
