import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ImageData } from '../types/image'

interface SelectionState<T = ImageData['id']> {
  selectedItems: Set<T>
  lastSelectedIndex: number | null

  isSelectionMode: boolean
  toggleSelectionMode: (open?: boolean) => void

  toggleSelection: (item: T, index?: number) => void
  selectItem: (item: T) => void
  deselectItem: (item: T) => void
  isSelected: (item: T) => boolean
  selectRange: (items: T[], fromIndex: number, toIndex: number) => void

  clearSelection: () => void
  selectAll: (items: T[]) => void
}

export const useSelectionStore = create<SelectionState>()(
  devtools(
    (set, get) => ({
      selectedItems: new Set(),
      lastSelectedIndex: null,
      isSelectionMode: false,

      toggleSelection: (item, index) => {
        set(
          state => {
            const newSet = new Set(state.selectedItems)
            let newLastIndex = state.lastSelectedIndex

            if (newSet.has(item)) {
              newSet.delete(item)
              // if we're deselecting the last selected item, clear the index
              if (index === state.lastSelectedIndex) {
                newLastIndex = null
              }
            } else {
              newSet.add(item)
              newLastIndex = index ?? state.lastSelectedIndex
            }

            return {
              selectedItems: newSet,
              lastSelectedIndex: newLastIndex,
            }
          },
          false,
          'toggleSelection',
        )
      },

      selectItem: item => {
        set(
          state => ({
            selectedItems: new Set(state.selectedItems).add(item),
          }),
          false,
          'selectItem',
        )
      },

      deselectItem: item => {
        set(
          state => {
            const newSet = new Set(state.selectedItems)
            newSet.delete(item)
            return { selectedItems: newSet }
          },
          false,
          'deselectItem',
        )
      },

      selectRange: (items, fromIndex, toIndex) => {
        set(
          state => {
            const newSet = new Set(state.selectedItems)
            const start = Math.min(fromIndex, toIndex)
            const end = Math.max(fromIndex, toIndex)

            for (let i = start; i <= end; i++) {
              if (items[i]) {
                newSet.add(items[i])
              }
            }

            return {
              selectedItems: newSet,
              lastSelectedIndex: toIndex,
            }
          },
          false,
          'selectRange',
        )
      },

      clearSelection: () => {
        set(
          { selectedItems: new Set(), lastSelectedIndex: null },
          false,
          'clearSelection',
        )
      },

      selectAll: items => {
        set(
          {
            selectedItems: new Set(items),
            lastSelectedIndex: items.length > 0 ? items.length - 1 : null,
          },
          false,
          'selectAll',
        )
      },

      toggleSelectionMode: open => {
        set(
          state => {
            const newMode = open !== undefined ? open : !state.isSelectionMode
            if (!newMode)
              return {
                isSelectionMode: newMode,
                selectedItems: new Set(),
                lastSelectedIndex: null,
              }

            return { isSelectionMode: newMode }
          },
          false,
          'toggleSelectionMode',
        )
      },

      isSelected: item => get().selectedItems.has(item),
    }),
    {
      name: 'selection-store',
    },
  ),
)
