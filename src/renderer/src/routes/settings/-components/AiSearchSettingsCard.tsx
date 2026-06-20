import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  CaretDownIcon,
  CheckIcon,
  GearIcon,
  ArrowClockwiseIcon,
  SparkleIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import {
  APP_SETTING_KEYS,
  CLIP_AVAILABLE_MODELS_DEFAULT,
  CLIP_DEFAULT_MODEL,
  ClipModelConfig,
} from '@/lib/types/appSettingsKeys'
import { cn } from '@/lib/utils'
import {
  useIndexedModels,
  useClearModelIndexMutation,
  useDeleteModelMutation,
  usePartialReindexMutation,
  useReindexClipMutation,
  useClipEnabled,
  useClipModels,
  useClipCurrentModel,
  useClipTextThreshold,
  useClipImageThreshold,
  useUpdateSettingMutation,
} from '@/lib/queries/settings'

export function AiSearchSettingsCard({ folderPath }: { folderPath: string }) {
  const { data: aiEnabled = true, isLoading: isLoadingEnabled } = useClipEnabled(folderPath)
  const { data: clipModels = [], isLoading: isLoadingModels } = useClipModels(folderPath)
  const { data: currentModel = '', isLoading: isLoadingCurrent } = useClipCurrentModel(folderPath)
  const { data: textThreshold = 0.2, isLoading: isLoadingText } = useClipTextThreshold(folderPath)
  const { data: imageThreshold = 0.6, isLoading: isLoadingImage } = useClipImageThreshold(folderPath)

  const [localTextThreshold, setLocalTextThreshold] = useState<number>(0.2)
  const [localImageThreshold, setLocalImageThreshold] = useState<number>(0.6)

  const { refetch: refetchIndexedModels } = useIndexedModels()
  const partialReindexMutation = usePartialReindexMutation(folderPath)
  const updateSettingMutation = useUpdateSettingMutation(folderPath)
  const queryClient = useQueryClient()

  useEffect(() => {
    setLocalTextThreshold(textThreshold)
  }, [textThreshold])

  useEffect(() => {
    setLocalImageThreshold(imageThreshold)
  }, [imageThreshold])

  const loading = isLoadingEnabled || isLoadingModels || isLoadingCurrent || isLoadingText || isLoadingImage

  const updateAiEnabled = async (checked: boolean) => {
    try {
      await updateSettingMutation.mutateAsync({
        key: APP_SETTING_KEYS.CLIP_ENABLED,
        value: checked,
        valueType: 'boolean',
      })
      queryClient.invalidateQueries({ queryKey: ['settings', APP_SETTING_KEYS.CLIP_ENABLED, folderPath] })
      queryClient.invalidateQueries({ queryKey: ['images'] })
      toast.success(`AI features ${checked ? 'enabled' : 'disabled'}`)
      if (checked) {
        partialReindexMutation.mutate(undefined, {
          onSuccess: () => {
            refetchIndexedModels()
          },
        })
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to update AI setting.')
    }
  }

  const updateCurrentModel = async (model: string) => {
    try {
      await updateSettingMutation.mutateAsync({
        key: APP_SETTING_KEYS.CLIP_CURRENT_MODEL,
        value: model,
        valueType: 'string',
      })
      queryClient.invalidateQueries({ queryKey: ['settings', APP_SETTING_KEYS.CLIP_CURRENT_MODEL, folderPath] })
      queryClient.invalidateQueries({ queryKey: ['images'] })
      toast.success(`Active AI model set to ${model.split('/').pop()}`)

      // Trigger a partial reindex in the background
      partialReindexMutation.mutate(undefined, {
        onSuccess: () => {
          refetchIndexedModels()
        },
      })
    } catch (e) {
      console.error(e)
      toast.error('Failed to update active AI model.')
    }
  }

  const updateTextThreshold = async (val: number) => {
    try {
      await updateSettingMutation.mutateAsync({
        key: APP_SETTING_KEYS.CLIP_TEXT_TO_IMAGE_THRESHOLD,
        value: val,
        valueType: 'number',
      })
      queryClient.invalidateQueries({ queryKey: ['settings', APP_SETTING_KEYS.CLIP_TEXT_TO_IMAGE_THRESHOLD, folderPath] })
      queryClient.invalidateQueries({ queryKey: ['images', 'paginated'] })
    } catch (e) {
      console.error(e)
      toast.error('Failed to save text threshold.')
    }
  }

  const updateImageThreshold = async (val: number) => {
    try {
      await updateSettingMutation.mutateAsync({
        key: APP_SETTING_KEYS.CLIP_IMAGE_TO_IMAGE_THRESHOLD,
        value: val,
        valueType: 'number',
      })
      queryClient.invalidateQueries({ queryKey: ['settings', APP_SETTING_KEYS.CLIP_IMAGE_TO_IMAGE_THRESHOLD, folderPath] })
      queryClient.invalidateQueries({ queryKey: ['images', 'paginated'] })
    } catch (e) {
      console.error(e)
      toast.error('Failed to save image threshold.')
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">AI Image Search</h2>
          <p className="text-sm text-muted-foreground">
            Configure local CLIP AI model criteria and similarity matching
            thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-semibold">Enable AI Features</span>
          <Switch
            checked={aiEnabled}
            onCheckedChange={updateAiEnabled}
          />
        </div>
      </div>

      {aiEnabled ? (
        <div className="space-y-6 animate-fade-in">
          {/* Model Selection Dropdown & Custom Model Form */}
          <ModelSelectorSection
            folderPath={folderPath}
            clipModels={clipModels}
            currentModel={currentModel}
            updateCurrentModel={updateCurrentModel}
          />

          {/* Model Index Management Section */}
          <ModelIndexManagementSection
            folderPath={folderPath}
            clipModels={clipModels}
            currentModel={currentModel}
            updateCurrentModel={updateCurrentModel}
          />

          {/* Text-to-Image Threshold Section */}
          <TextThresholdSection
            localTextThreshold={localTextThreshold}
            setLocalTextThreshold={setLocalTextThreshold}
            updateTextThreshold={updateTextThreshold}
          />

          {/* Image-to-Image Threshold Section */}
          <ImageThresholdSection
            localImageThreshold={localImageThreshold}
            setLocalImageThreshold={setLocalImageThreshold}
            updateImageThreshold={updateImageThreshold}
          />

          {/* Full Gallery Re-indexing Footer */}
          <ReindexGallerySection
            folderPath={folderPath}
            refetchIndexedModels={refetchIndexedModels}
          />
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-500 flex items-start gap-2 animate-fade-in">
          <SparkleIcon className="size-4 shrink-0 mt-0.5" />
          <span>
            AI features are currently disabled for this folder. Enable them to activate natural language text-to-image search, image-to-image similarity matching, and auto tag suggestions.
          </span>
        </div>
      )}
    </div>
  )
}

interface ModelSelectorSectionProps {
  folderPath: string
  clipModels: ClipModelConfig[]
  currentModel: string
  updateCurrentModel: (model: string) => Promise<void>
}

function ModelSelectorSection({
  folderPath,
  clipModels,
  currentModel,
  updateCurrentModel,
}: ModelSelectorSectionProps) {
  const [isAddingModel, setIsAddingModel] = useState(false)
  const [newModelId, setNewModelId] = useState('')
  const [newModelDim, setNewModelDim] = useState<number>(512)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{
    title: string
    description: string
    actionLabel: string
    onAction: () => void
  } | null>(null)
  const deleteModelMutation = useDeleteModelMutation(folderPath)
  const updateSettingMutation = useUpdateSettingMutation(folderPath)
  const queryClient = useQueryClient()

  const handleAddCustomModel = async () => {
    if (!newModelId.trim() || !newModelDim) return
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
      await updateSettingMutation.mutateAsync({
        key: APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS,
        value: updatedModels,
        valueType: 'json_array',
      })

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

  return (
    <div className="space-y-4">
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
                  onSelect={e => {
                    if (
                      (e.target as HTMLElement).closest('.delete-model-btn')
                    ) {
                      e.preventDefault()
                      return
                    }
                    updateCurrentModel(model.id)
                  }}
                  className="font-mono text-xs cursor-pointer flex justify-between items-center pr-2"
                >
                  <div className="flex flex-col text-left min-w-0 flex-1">
                    <span
                      className={cn(
                        'truncate block',
                        model.id === currentModel && 'font-bold text-primary',
                      )}
                    >
                      {model.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Dimension: {model.dimension}d
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {model.id === currentModel && (
                      <CheckIcon className="size-4 text-primary shrink-0 animate-fade-in" />
                    )}
                    <button
                      type="button"
                      className="delete-model-btn p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="Delete model"
                      onClick={e => {
                        e.stopPropagation()
                        if (clipModels.length <= 1) {
                           toast.error('Cannot delete the last remaining model.')
                           return
                        }
                        setAlertConfig({
                          title: 'Delete CLIP Model?',
                          description: `Are you sure you want to delete "${model.id}"? This will clear its database index and remove it from available models.`,
                          actionLabel: 'Delete',
                          onAction: () => {
                            deleteModelMutation.mutate(model.id, {
                              onSuccess: () => {
                                queryClient.invalidateQueries({
                                  queryKey: ['settings', APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS, folderPath],
                                })
                                if (currentModel === model.id) {
                                  const remaining =
                                    clipModels.length > 1
                                      ? clipModels.filter(m => m.id !== model.id)[0].id
                                      : CLIP_DEFAULT_MODEL
                                  updateCurrentModel(remaining)
                                }
                              },
                            })
                          },
                        })
                        setAlertOpen(true)
                      }}
                    >
                      {deleteModelMutation.isPending &&
                      deleteModelMutation.variables === model.id ? (
                        <Spinner className="size-3 animate-spin" />
                      ) : (
                        <TrashIcon className="size-3.5" />
                      )}
                    </button>
                  </div>
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
      {alertConfig && (
        <AlertDialog
          open={alertOpen}
          onOpenChange={setAlertOpen}
          title={alertConfig.title}
          description={alertConfig.description}
          actionLabel={alertConfig.actionLabel}
          onAction={() => {
            alertConfig.onAction()
            setAlertOpen(false)
          }}
        />
      )}
    </div>
  )
}

interface ModelIndexManagementSectionProps {
  folderPath: string
  clipModels: ClipModelConfig[]
  currentModel: string
  updateCurrentModel: (model: string) => Promise<void>
}

function ModelIndexManagementSection({
  folderPath,
  clipModels,
  currentModel,
  updateCurrentModel,
}: ModelIndexManagementSectionProps) {
  const [isManageExpanded, setIsManageExpanded] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{
    title: string
    description: string
    actionLabel: string
    onAction: () => void
  } | null>(null)
  const { data: indexedModels = [], refetch: refetchIndexedModels } =
    useIndexedModels()
  const clearModelIndexMutation = useClearModelIndexMutation(folderPath)
  const deleteModelMutation = useDeleteModelMutation(folderPath)
  const queryClient = useQueryClient()

  const modelsToManage = clipModels.filter(model => {
    const isSystem = CLIP_AVAILABLE_MODELS_DEFAULT.some(m => m.id === model.id)
    if (!isSystem) return true // Always show custom models so they can be deleted
    const tableName = 'vec_images_' + model.id.replace(/[^a-zA-Z0-9_]/g, '_')
    return indexedModels.includes(tableName)
  })

  const indexedCount = clipModels.filter(model => {
    const tableName = 'vec_images_' + model.id.replace(/[^a-zA-Z0-9_]/g, '_')
    return indexedModels.includes(tableName)
  }).length

  const handleClearModelIndex = (modelId: string) => {
    setAlertConfig({
      title: 'Clear Index Embeddings?',
      description: `Are you sure you want to clear all index embeddings for "${modelId}"? This will delete the search index for this model.`,
      actionLabel: 'Clear Index',
      onAction: () => {
        clearModelIndexMutation.mutate(modelId, {
          onSuccess: () => {
            refetchIndexedModels()
          },
        })
      },
    })
    setAlertOpen(true)
  }

  const handleDeleteModel = (modelId: string) => {
    if (clipModels.length <= 1) {
      toast.error('Cannot delete the last remaining model.')
      return
    }
    setAlertConfig({
      title: 'Delete CLIP Model?',
      description: `Are you sure you want to delete "${modelId}"? This will clear its database index and remove it from available models.`,
      actionLabel: 'Delete',
      onAction: () => {
        deleteModelMutation.mutate(modelId, {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: ['settings', APP_SETTING_KEYS.CLIP_AVAILABLE_MODELS, folderPath],
            })

            if (currentModel === modelId) {
              const remaining =
                clipModels.length > 1
                  ? clipModels.filter(m => m.id !== modelId)[0].id
                  : CLIP_DEFAULT_MODEL
              updateCurrentModel(remaining)
            }
            refetchIndexedModels()
          },
        })
      },
    })
    setAlertOpen(true)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsManageExpanded(!isManageExpanded)}
        className="flex items-center justify-between w-full text-left py-2 font-bold text-sm text-foreground hover:opacity-80 transition-opacity focus:outline-none"
      >
        <span className="flex items-center gap-2">
          <GearIcon className="size-4 text-muted-foreground" />
          Manage Model Indexes
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-normal text-muted-foreground font-sans">
            {indexedCount} indexed model{indexedCount !== 1 ? 's' : ''}
          </span>
          <CaretDownIcon
            className={cn(
              'size-4 opacity-70 transition-transform duration-200',
              isManageExpanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {isManageExpanded && (
        <div className="space-y-3 pt-1 animate-fade-in">
          <p className="text-xs text-muted-foreground">
            Clear stored search embeddings or delete custom models from the
            database.
          </p>
          {modelsToManage.length === 0 ? (
            <div className="p-4 border border-border/30 rounded-xl bg-card/5 text-center text-xs text-muted-foreground font-sans">
              No models found to manage.
            </div>
          ) : (
            <div className="border border-border/40 rounded-xl bg-card/5 overflow-hidden divide-y divide-border/20">
              {modelsToManage.map(model => {
                const isSystem = CLIP_AVAILABLE_MODELS_DEFAULT.some(
                  m => m.id === model.id,
                )
                const isActive = model.id === currentModel
                const tableName =
                  'vec_images_' + model.id.replace(/[^a-zA-Z0-9_]/g, '_')
                const hasTable = indexedModels.includes(tableName)

                return (
                  <div
                    key={model.id}
                    className="p-3 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            'font-mono text-xs truncate font-semibold',
                            isActive
                              ? 'text-primary font-bold'
                              : 'text-foreground',
                          )}
                        >
                          {model.name}
                        </span>
                        {isActive && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold font-sans">
                            Active
                          </span>
                        )}
                        {isSystem ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-sans">
                            System
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-sans font-bold">
                            Custom
                          </span>
                        )}
                        {!hasTable && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-sans font-bold">
                            Unindexed
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Dimension: {model.dimension}d
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !hasTable ||
                          clearModelIndexMutation.isPending ||
                          deleteModelMutation.isPending
                        }
                        onClick={() => handleClearModelIndex(model.id)}
                        className="h-7 px-2.5 text-[11px]"
                      >
                        {clearModelIndexMutation.isPending &&
                        clearModelIndexMutation.variables === model.id ? (
                          <Spinner className="size-3 mr-1" />
                        ) : null}
                        Clear Index
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={
                          clearModelIndexMutation.isPending ||
                          deleteModelMutation.isPending
                        }
                        onClick={() => handleDeleteModel(model.id)}
                        className="h-7 px-2.5 text-[11px]"
                      >
                        {deleteModelMutation.isPending &&
                        deleteModelMutation.variables === model.id ? (
                          <Spinner className="size-3 mr-1" />
                        ) : null}
                        Delete
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {alertConfig && (
        <AlertDialog
          open={alertOpen}
          onOpenChange={setAlertOpen}
          title={alertConfig.title}
          description={alertConfig.description}
          actionLabel={alertConfig.actionLabel}
          onAction={() => {
            alertConfig.onAction()
            setAlertOpen(false)
          }}
        />
      )}
    </div>
  )
}

interface TextThresholdSectionProps {
  localTextThreshold: number
  setLocalTextThreshold: React.Dispatch<React.SetStateAction<number>>
  updateTextThreshold: (val: number) => Promise<void>
}

function TextThresholdSection({
  localTextThreshold,
  setLocalTextThreshold,
  updateTextThreshold,
}: TextThresholdSectionProps) {
  return (
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
  )
}

interface ImageThresholdSectionProps {
  localImageThreshold: number
  setLocalImageThreshold: React.Dispatch<React.SetStateAction<number>>
  updateImageThreshold: (val: number) => Promise<void>
}

function ImageThresholdSection({
  localImageThreshold,
  setLocalImageThreshold,
  updateImageThreshold,
}: ImageThresholdSectionProps) {
  return (
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
  )
}

interface ReindexGallerySectionProps {
  folderPath: string
  refetchIndexedModels: () => void
}

function ReindexGallerySection({
  folderPath,
  refetchIndexedModels,
}: ReindexGallerySectionProps) {
  const reindexClipMutation = useReindexClipMutation(folderPath)
  const isReindexing = reindexClipMutation.isPending

  const handleReindexClip = async () => {
    if (!folderPath) return
    reindexClipMutation.mutate(undefined, {
      onSuccess: () => {
        refetchIndexedModels()
      },
    })
  }

  return (
    <div className="pt-2 border-t border-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1 max-w-md">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <SparkleIcon className="size-4 text-muted-foreground" />
          Re-index AI search library
        </span>
        <p className="text-xs text-muted-foreground">
          Wipes and re-evaluates all image features using the currently selected
          model.
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
  )
}
