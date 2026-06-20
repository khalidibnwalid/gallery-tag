import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import {
  CLIP_AVAILABLE_MODELS_DEFAULT,
  CLIP_DEFAULT_MODEL,
} from '@/lib/types/appSettingsKeys'
import {
  SparkleIcon,
  FolderOpenIcon,
  PaletteIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  InfoIcon,
  ImageIcon,
  CaretDownIcon,
} from '@phosphor-icons/react'

interface SetupWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderPath: string
  onStart: (settings: {
    aiEnabled: boolean
    clipModel: string
    thumbnailQuality: number | null
  }) => Promise<void>
}

export function SetupWizardDialog({
  open,
  onOpenChange,
  folderPath,
  onStart,
}: SetupWizardDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [clipModel, setClipModel] = useState<string>(CLIP_DEFAULT_MODEL)
  const [isLossless, setIsLossless] = useState(true)
  const [thumbnailQuality, setThumbnailQuality] = useState<number>(90)
  const [loading, setLoading] = useState(false)

  const folderName = folderPath.split(/[\\/]/).pop() || folderPath

  const selectedModelInfo = CLIP_AVAILABLE_MODELS_DEFAULT.find(
    m => m.id === clipModel,
  )

  const handleLetsStart = async () => {
    try {
      setLoading(true)
      await onStart({
        aiEnabled,
        clipModel,
        thumbnailQuality: isLossless ? null : thumbnailQuality,
      })
    } catch (err) {
      console.error('Failed to initialize folder settings:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent
        showCloseButton={!loading}
        className="sm:max-w-2xl bg-background border border-border/40 p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col max-h-[85vh]"
      >
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {step === 1 ? (
            <div className="space-y-6 animate-fade-in">
              <DialogHeader className="text-center space-y-2">
                <div className="mx-auto size-12 rounded-xl bg-foreground/5 text-foreground flex items-center justify-center">
                  <ImageIcon className="size-6" weight="duotone" />
                </div>
                <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground">
                  Welcome to Gallery
                </DialogTitle>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Let's set up <span className="font-semibold text-foreground">/{folderName}</span>. 
                  Here is a quick look at the features you can use to organize your images.
                </p>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Folders & Tagging */}
                <div className="flex gap-3 p-4 rounded-xl border border-border/40 bg-card/25 hover:bg-card/40 transition-colors">
                  <div className="size-9 rounded-lg bg-foreground/5 text-foreground flex items-center justify-center shrink-0">
                    <FolderOpenIcon className="size-5" weight="duotone" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">Folders & Tagging</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Browse your physical subdirectories and organize them using recursive, nested tag hierarchies.
                    </p>
                  </div>
                </div>

                {/* Color Filtering */}
                <div className="flex gap-3 p-4 rounded-xl border border-border/40 bg-card/25 hover:bg-card/40 transition-colors">
                  <div className="size-9 rounded-lg bg-foreground/5 text-foreground flex items-center justify-center shrink-0">
                    <PaletteIcon className="size-5" weight="duotone" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">Color Filtering</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Dominant colors are automatically extracted from each image so you can filter and search by hues.
                    </p>
                  </div>
                </div>

                {/* Smart Unified Search */}
                <div className="flex gap-3 p-4 rounded-xl border border-border/40 bg-card/25 hover:bg-card/40 transition-colors">
                  <div className="size-9 rounded-lg bg-foreground/5 text-foreground flex items-center justify-center shrink-0">
                    <MagnifyingGlassIcon className="size-5" weight="duotone" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">Unified Search</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Combine folders, tags, colors, and dates in a single search bar to instantly narrow down matches.
                    </p>
                  </div>
                </div>

                {/* AI Suggestions & Similarity */}
                <div className="flex gap-3 p-4 rounded-xl border border-border/40 bg-card/25 hover:bg-card/40 transition-colors">
                  <div className="size-9 rounded-lg bg-foreground/5 text-foreground flex items-center justify-center shrink-0">
                    <SparkleIcon className="size-5" weight="duotone" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">AI Suggestions</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Get smart suggestions for tagging and find visually similar images based on semantic features.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <DialogHeader className="space-y-1 text-center">
                <DialogTitle className="text-xl font-bold text-foreground">
                  Configuration Settings
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Optimize indexing and performance parameters for your library.
                </p>
              </DialogHeader>

              <div className="space-y-4">
                {/* AI Indexing Settings */}
                <div className="p-4 rounded-xl border border-border/40 bg-card/25 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 max-w-[80%]">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <SparkleIcon className="size-4 text-foreground/80" />
                        AI Semantic Indexing
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Enables natural language text-to-image search, visual similarity matching, and auto tag suggestions.
                      </p>
                    </div>
                    <Switch
                      checked={aiEnabled}
                      onCheckedChange={setAiEnabled}
                    />
                  </div>

                  {aiEnabled ? (
                    <div className="p-4 border border-border/40 rounded-xl bg-background/50 space-y-3 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <label className="text-xs font-semibold text-foreground">
                            CLIP Neural Model
                          </label>
                          <p className="text-[10px] text-muted-foreground">
                            Select a local model. Larger models are more accurate but run slower.
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-mono text-xs w-48 justify-between"
                            >
                              <span className="truncate">
                                {clipModel.split('/').pop()}
                              </span>
                              <CaretDownIcon className="size-4 opacity-50 shrink-0" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56 bg-popover border border-border/40">
                            {CLIP_AVAILABLE_MODELS_DEFAULT.map(model => (
                              <DropdownMenuItem
                                key={model.id}
                                onSelect={() => setClipModel(model.id)}
                                className="font-mono text-xs cursor-pointer flex justify-between items-center"
                              >
                                <span>{model.name.split('/').pop()}</span>
                                {model.id === clipModel && (
                                  <CheckIcon className="size-3 text-foreground" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {selectedModelInfo && (
                        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/20">
                          <InfoIcon className="size-3.5 text-foreground/60 shrink-0 mt-0.5" />
                          <span>
                            Selected model uses {selectedModelInfo.dimension} dimensions. First-time load will download files (~150MB-350MB) and save embeddings locally.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/20 text-[10px] text-muted-foreground flex items-start gap-2">
                      <InfoIcon className="size-3.5 text-foreground/60 shrink-0 mt-0.5" />
                      <span>
                        AI features are disabled. No neural models will be downloaded, saving storage space and system memory.
                      </span>
                    </div>
                  )}
                </div>

                {/* Thumbnail Quality Settings */}
                <div className="p-4 rounded-xl border border-border/40 bg-card/25 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 max-w-[80%]">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="size-4 text-foreground/80" />
                        Thumbnail Cache Settings
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Select the WebP compression quality. Lower quality saves storage space; higher quality provides sharper details.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-background/50 border border-border/20 px-2 py-1 rounded-lg">
                      <span className="text-[10px] font-medium text-muted-foreground">Lossless</span>
                      <Switch
                        checked={isLossless}
                        onCheckedChange={setIsLossless}
                      />
                    </div>
                  </div>

                  {!isLossless ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Compression Level</span>
                        <span className="font-mono font-bold text-foreground">{thumbnailQuality}%</span>
                      </div>
                      <Slider
                        value={[thumbnailQuality]}
                        min={1}
                        max={100}
                        step={1}
                        onValueChange={val => setThumbnailQuality(val[0])}
                      />
                      <div className="text-[10px] text-muted-foreground flex items-start gap-1">
                        <InfoIcon className="size-3.5 shrink-0 text-foreground/60 mt-0.5" />
                        <span>Recommended quality is 90% for a balanced compression-to-quality ratio.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/20 text-[10px] text-muted-foreground flex items-start gap-2">
                      <InfoIcon className="size-3.5 text-foreground/60 shrink-0 mt-0.5" />
                      <span>
                        Lossless mode stores full-fidelity thumbnails, which consumes significantly more storage space.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="border-t border-border/20 bg-muted/30 p-4 flex items-center justify-between shrink-0">
          {step === 1 ? (
            <>
              <div className="flex gap-1.5">
                <span className="size-1.5 rounded-full bg-foreground" />
                <span className="size-1.5 rounded-full bg-foreground/20" />
              </div>
              <Button
                onClick={() => setStep(2)}
                className="text-xs font-semibold px-4 h-9 gap-1.5"
              >
                Configure Indexing
                <ArrowRightIcon className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                disabled={loading}
                onClick={() => setStep(1)}
                className="text-xs h-9 gap-1.5"
              >
                <ArrowLeftIcon className="size-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="size-1.5 rounded-full bg-foreground/20" />
                  <span className="size-1.5 rounded-full bg-foreground" />
                </div>
                <Button
                  disabled={loading}
                  onClick={handleLetsStart}
                  className="text-xs font-semibold px-5 h-9 gap-1.5 min-w-28"
                >
                  {loading ? (
                    <Spinner className="size-4 animate-spin" />
                  ) : (
                    <>
                      Let's Start
                      <CheckIcon className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
