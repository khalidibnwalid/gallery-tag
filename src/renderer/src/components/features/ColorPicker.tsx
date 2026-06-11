import { useState, useEffect } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import useDebounce from '@/lib/hooks/useDebounce'
import { PaletteIcon } from '@phosphor-icons/react'

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#6b7280', // Gray
  '#1f2937', // Dark Gray
]

interface ColorPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState('#3b82f6')
  const [hexInput, setHexInput] = useState('#3b82f6')

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      setCustomColor(value)
      setHexInput(value)
    }
  }, [value])

  const debouncedOnChange = useDebounce((color: string | null) => {
    onChange(color)
  }, 400)

  const handlePresetSelect = (color: string) => {
    setCustomColor(color)
    setHexInput(color)
    onChange(color)
  }

  const handleHexInputChange = (val: string) => {
    setHexInput(val)
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      setCustomColor(val)
      debouncedOnChange(val)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'opacity-70 hover:opacity-100 backdrop-blur-none cursor-pointer',
            className,
          )}
        >
          <PaletteIcon size={20} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-64 p-3 bg-background/95 border border-border/80 shadow-2xl rounded-2xl flex flex-col gap-3"
      >
        {/* Color Preview Banner */}
        <div
          className="h-12 w-full rounded-lg flex items-center justify-center font-mono text-sm font-bold text-white shadow-inner select-none transition-all duration-250"
          style={{
            backgroundColor: customColor,
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          {customColor.toUpperCase()}
        </div>

        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none px-0.5">
          Preset Palettes
        </div>

        {/* Curated Grid */}
        <div className="grid grid-cols-7 gap-1.5 justify-items-center">
          {PRESET_COLORS.map(color => {
            const isActive = value === color || customColor === color
            return (
              <button
                key={color}
                className={cn(
                  'size-6 rounded-full border border-foreground/10 transition-all cursor-pointer relative flex items-center justify-center hover:scale-110 active:scale-95 focus:outline-hidden',
                  isActive &&
                    'ring-2 ring-foreground/40 ring-offset-2 scale-105',
                )}
                style={{ backgroundColor: color }}
                onClick={() => handlePresetSelect(color)}
              >
                {isActive && (
                  <div className="size-2 rounded-full bg-white shadow-xs" />
                )}
              </button>
            )
          })}
        </div>

        <div className="h-px bg-border/40 my-0.5" />

        {/* Custom Input Section */}
        <div className="flex items-center gap-2">
          {/* Native Picker Button */}
          <div
            className="relative size-8 rounded-lg border border-border overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shrink-0"
            style={{ backgroundColor: customColor }}
            title="Open Color Wheel"
          >
            <input
              type="color"
              value={customColor}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onChange={e => {
                const val = e.target.value
                setCustomColor(val)
                setHexInput(val)
                debouncedOnChange(val)
              }}
            />
            <PaletteIcon
              size={16}
              className="text-white drop-shadow-md pointer-events-none"
            />
          </div>

          {/* Hex TextInput */}
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground select-none">
              #
            </span>
            <Input
              value={hexInput.replace('#', '')}
              maxLength={6}
              className="h-8 ps-6 pe-2 text-xs font-mono bg-background/50 border-border!"
              placeholder="FFFFFF"
              onChange={e => handleHexInputChange('#' + e.target.value)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
