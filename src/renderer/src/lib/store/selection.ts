import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ImageData } from '../types/image'

interface SelectionState<T = ImageData['id']> {
  selectedItems: Set<T>

  isSelectionMode: boolean
  toggleSelectionMode: (open?: boolean) => void

  toggleSelection: (item: T) => void
  selectItem: (item: T) => void
  deselectItem: (item: T) => void
  isSelected: (item: T) => boolean

  clearSelection: () => void
  selectAll: (items: T[]) => void
}

export const useSelectionStore = create<SelectionState>()(
  devtools(
    (set, get) => ({
      selectedItems: new Set(),
      isSelectionMode: false,

      toggleSelection: item => {
        set(
          state => {
            const newSet = new Set(state.selectedItems)
            if (newSet.has(item)) {
              newSet.delete(item)
            } else {
              newSet.add(item)
            }
            return { selectedItems: newSet }
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

      clearSelection: () => {
        set({ selectedItems: new Set() }, false, 'clearSelection')
      },

      selectAll: items => {
        set({ selectedItems: new Set(items) }, false, 'selectAll')
      },

      toggleSelectionMode: open => {
        set(
          state => {
            const newMode = open !== undefined ? open : !state.isSelectionMode
            if (!newMode)
              return {
                isSelectionMode: newMode,
                selectedItems: new Set(),
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
