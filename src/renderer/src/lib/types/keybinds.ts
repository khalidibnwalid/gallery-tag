export interface Keybinds {
  toggleSearch: string
  nextTab: string
  prevTab: string
  closeTab: string
  toggleSidebar: string
  toggleSelectionMode: string
  selectAll: string
  deleteSelected: string
  rename: string
  openFolder: string
  toggleTagging: string
  toggleAiSearch: string
}

export const DEFAULT_HOTKEYS: Keybinds = {
  toggleSearch: 'Control+p',
  nextTab: 'Control+Tab',
  prevTab: 'Shift+Control+Tab',
  closeTab: 'Control+w',
  toggleSidebar: 'Control+b',
  toggleSelectionMode: 'Control+s',
  selectAll: 'Control+a',
  deleteSelected: 'Delete',
  rename: 'F2',
  openFolder: 'Control+o',
  toggleTagging: 'Control+t',
  toggleAiSearch: 'Control+Shift+p',
}

export const KEYBIND_LABELS: Record<keyof Keybinds, string> = {
  toggleSearch: 'Toggle Search Bar (Focus / Blur)',
  nextTab: 'Switch to Next Tab',
  prevTab: 'Switch to Previous Tab',
  closeTab: 'Close Active Tab',
  toggleSidebar: 'Toggle Sidebar',
  toggleSelectionMode: 'Toggle Selection Mode',
  selectAll: 'Select All (in Selection Mode)',
  deleteSelected: 'Delete Selected Images',
  rename: 'Rename Selected Image',
  openFolder: 'Open Folder Dialog',
  toggleTagging: 'Toggle Tag Selector',
  toggleAiSearch: 'Toggle AI Search Mode',
}
