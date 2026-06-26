import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ImageData } from '../types/image'
import { SearchFilter } from '@main/types/api.shared'

interface SelectionState<T = ImageData['id']> {
  selectedItems: Set<T>
  lastSelectedIndex: number | null
  selectionQuery: SearchFilter | null

  isSelectionMode: boolean
  toggleSelectionMode: (open?: boolean) => void

  toggleSelection: (item: T, index?: number) => void
  selectItem: (item: T) => void
  deselectItem: (item: T) => void
  isSelected: (item: T) => boolean
  selectRange: (items: T[], fromIndex: number, toIndex: number) => void

  clearSelection: () => void
  selectAll: (items: T[], query?: SearchFilter) => void

  isDeleteDialogOpen: boolean
  setDeleteDialogOpen: (open: boolean) => void

  renamingImageId: T | null
  setRenamingImageId: (id: T | null) => void
}

export const useSelectionStore = create<SelectionState>()(
  devtools(
    (set, get) => ({
      selectedItems: new Set(),
      lastSelectedIndex: null,
      selectionQuery: null,
      isSelectionMode: false,
      isDeleteDialogOpen: false,
      renamingImageId: null,

      setDeleteDialogOpen: open => set({ isDeleteDialogOpen: open }, false, 'setDeleteDialogOpen'),
      setRenamingImageId: id => set({ renamingImageId: id }, false, 'setRenamingImageId'),

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
              selectionQuery: null,
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
            selectionQuery: null,
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
            return {
              selectedItems: newSet,
              selectionQuery: null,
            }
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
              selectionQuery: null,
            }
          },
          false,
          'selectRange',
        )
      },

      clearSelection: () => {
        set(
          { selectedItems: new Set(), lastSelectedIndex: null, selectionQuery: null },
          false,
          'clearSelection',
        )
      },

      selectAll: (items, query) => {
        set(
          {
            selectedItems: new Set(items),
            lastSelectedIndex: items.length > 0 ? items.length - 1 : null,
            selectionQuery: query || null,
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
                selectionQuery: null,
                isDeleteDialogOpen: false,
                renamingImageId: null,
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
