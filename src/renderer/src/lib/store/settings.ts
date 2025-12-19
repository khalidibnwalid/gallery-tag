import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  isFolderTreeOpen: boolean
  toggleFolderTree: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      isFolderTreeOpen: true,
      toggleFolderTree: () =>
        set(state => ({ isFolderTreeOpen: !state.isFolderTreeOpen })),
    }),
    {
      name: 'settings-storage',
    },
  ),
)
