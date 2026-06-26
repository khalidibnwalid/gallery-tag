import { SettingValue } from '@main/types/models.shared'
import { create } from 'zustand'
import { DEFAULT_HOTKEYS, Keybinds } from '../types/keybinds'

interface KeybindsState {
  keybinds: Keybinds
  isLoading: boolean
  setKeybinds: (keybinds: Keybinds) => void
  updateKeybind: (
    key: keyof Keybinds,
    combo: string,
    folderPath: string | null,
  ) => Promise<void>
  loadKeybinds: (folderPath: string | null) => Promise<void>
}

const GLOBAL_STORAGE_KEY = 'gallery_global_keybinds'

export const useKeybindsStore = create<KeybindsState>((set, get) => ({
  keybinds: DEFAULT_HOTKEYS,
  isLoading: false,

  setKeybinds: keybinds => set({ keybinds }),

  updateKeybind: async (key, combo, folderPath) => {
    const updated = { ...get().keybinds, [key]: combo }
    set({ keybinds: updated })

    // Save to localStorage as the global template
    localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(updated))

    // Save to current active folder settings DB if available
    if (folderPath && window.api?.settings?.set) {
      try {
        await window.api.settings.set(
          folderPath,
          'keybinds',
          updated,
          'json',
        )
      } catch (err) {
        console.error(
          'Failed to save keybindings to folder settings database:',
          err,
        )
      }
    }
  },

  loadKeybinds: async folderPath => {
    set({ isLoading: true })
    try {
      // 1. If no folder open, check localstorage or fallback to defaults
      if (!folderPath) {
        const localVal = localStorage.getItem(GLOBAL_STORAGE_KEY)
        if (localVal) {
          try {
            const parsed = JSON.parse(localVal)
            const merged = { ...DEFAULT_HOTKEYS, ...parsed }
            set({ keybinds: merged })
          } catch {
            set({ keybinds: DEFAULT_HOTKEYS })
          }
        } else {
          set({ keybinds: DEFAULT_HOTKEYS })
        }
        return
      }

      // 2. Folder is open. First check DB
      if (window.api?.settings?.getValue) {
        try {
          const dbVal = await window.api.settings.getValue<{
            [key: string]: string
          }>(
            folderPath,
            'keybinds',
          )
          if (
            dbVal &&
            typeof dbVal === 'object' &&
            Object.keys(dbVal).length > 0
          ) {
            // Ensure all keys are populated in case of updates, fallback missing ones to default
            const merged = { ...DEFAULT_HOTKEYS, ...dbVal }
            set({ keybinds: merged })
            return
          }
        } catch (err) {
          console.error(
            'Failed to read keybindings from folder settings database:',
            err,
          )
        }
      }

      // 3. Fallback: check localStorage
      const localVal = localStorage.getItem(GLOBAL_STORAGE_KEY)
      if (localVal) {
        try {
          const parsed = JSON.parse(localVal)
          const merged = { ...DEFAULT_HOTKEYS, ...parsed }
          set({ keybinds: merged })

          // Copy to settings DB
          if (window.api?.settings?.set) {
            await window.api.settings.set(
              folderPath,
              'keybinds',
              merged,
              'json',
            )
          }
          return
        } catch (e) {
          console.error(
            'Failed to parse global keybinds fallback from localStorage:',
            e,
          )
        }
      }

      // 4. Ultimate fallback: use DEFAULT_HOTKEYS, sync to both DB and localStorage
      set({ keybinds: DEFAULT_HOTKEYS })
      localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(DEFAULT_HOTKEYS))
      if (window.api?.settings?.set) {
        try {
          await window.api.settings.set(
            folderPath,
            'keybinds',
            DEFAULT_HOTKEYS as unknown as SettingValue,
            'json',
          )
        } catch (err) {
          console.error(
            'Failed to write default keybinds to folder settings database:',
            err,
          )
        }
      }
    } finally {
      set({ isLoading: false })
    }
  },
}))
