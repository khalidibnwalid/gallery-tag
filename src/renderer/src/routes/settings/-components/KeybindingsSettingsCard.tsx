import { useState, useEffect } from 'react'
import { useFolder } from '@/components/providers/FolderProvider'
import { useKeybindsStore } from '@/lib/store/keybindsStore'
import { Keybinds, KEYBIND_LABELS, DEFAULT_HOTKEYS } from '@/lib/types/keybinds'
import { Button } from '@/components/ui/button'
import { KeyboardIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function KeybindingsSettingsCard() {
  const { folderPath } = useFolder()
  const { keybinds, updateKeybind, setKeybinds } = useKeybindsStore()
  const [listeningKey, setListeningKey] = useState<keyof Keybinds | null>(null)

  useEffect(() => {
    if (!listeningKey) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Skip naked modifier presses
      if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return

      const keys: string[] = []
      // Standardize modifier order: Shift + Control + Alt + Meta
      if (e.shiftKey) keys.push('Shift')
      if (e.ctrlKey) keys.push('Control')
      if (e.altKey) keys.push('Alt')
      if (e.metaKey) keys.push('Meta')

      let keyName = e.key
      if (keyName === ' ') {
        keyName = 'Space'
      } else if (keyName.length === 1) {
        // TanStack Hotkeys parses letters as lowercase
        keyName = keyName.toLowerCase()
      }

      keys.push(keyName)
      const combo = keys.join('+')

      updateKeybind(listeningKey, combo, folderPath).then(() => {
        toast.success(`Updated shortcut for ${KEYBIND_LABELS[listeningKey]} to ${combo}`)
      })
      setListeningKey(null)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [listeningKey, folderPath, updateKeybind])

  const handleResetToDefaults = async () => {
    if (window.api?.settings?.set && folderPath) {
      try {
        await window.api.settings.set(folderPath, 'keybinds', DEFAULT_HOTKEYS as any, 'json')
      } catch (err) {
        console.error(err)
      }
    }
    setKeybinds(DEFAULT_HOTKEYS)
    localStorage.setItem('gallery_global_keybinds', JSON.stringify(DEFAULT_HOTKEYS))
    toast.success('Reset all keybindings to defaults.')
  }

  return (
    <div className="border border-border/40 bg-card/20 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <KeyboardIcon className="size-5 text-primary" />
            Keyboard Shortcuts
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure global application hotkeys. Click a hotkey button to record a new key combination.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleResetToDefaults}
          className="flex items-center gap-1.5 cursor-pointer text-xs"
        >
          <ArrowCounterClockwiseIcon className="size-4" />
          Reset to Defaults
        </Button>
      </div>

      <div className="border border-border/40 rounded-xl divide-y divide-border/40 overflow-hidden bg-background/30">
        {(Object.keys(KEYBIND_LABELS) as Array<keyof Keybinds>).map((key) => {
          const isListening = listeningKey === key
          const combo = keybinds[key]

          return (
            <div
              key={key}
              className="flex items-center justify-between p-4 transition-colors hover:bg-card/5"
            >
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-foreground">
                  {KEYBIND_LABELS[key]}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={isListening ? 'default' : 'outline'}
                  className="min-w-[120px] font-mono text-xs font-semibold cursor-pointer h-9 px-4 rounded-lg shadow-sm"
                  onClick={() => setListeningKey(isListening ? null : key)}
                >
                  {isListening ? (
                    <span className="animate-pulse">Press keys...</span>
                  ) : (
                    combo || 'None'
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
