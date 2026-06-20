import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowClockwiseIcon, InfoIcon } from '@phosphor-icons/react'
import {
  APP_SETTING_KEYS,
} from '@/lib/types/appSettingsKeys'
import { cn } from '@/lib/utils'
import { useThumbnailQuality, useUpdateSettingMutation } from '@/lib/queries/settings'

export function ThumbnailSettingsCard({ folderPath }: { folderPath: string }) {
  const { data: thumbnailQuality = null, isLoading } = useThumbnailQuality(folderPath)
  const [localQuality, setLocalQuality] = useState<number>(90)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const updateSettingMutation = useUpdateSettingMutation(folderPath)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (thumbnailQuality !== undefined && thumbnailQuality !== null) {
      setLocalQuality(thumbnailQuality)
    } else {
      setLocalQuality(90)
    }
  }, [thumbnailQuality])

  const updateThumbnailQuality = async (val: number | null) => {
    try {
      await updateSettingMutation.mutateAsync({
        key: APP_SETTING_KEYS.THUMBNAIL_QUALITY,
        value: val,
        valueType: 'number',
      })
    } catch (e) {
      console.error(e)
      toast.error('Failed to save thumbnail quality.')
    }
  }

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

  if (isLoading) {
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
