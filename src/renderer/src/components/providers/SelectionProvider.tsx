import React, { createContext, useContext, useState } from 'react'

interface ContextType<T> {
  selectedItems: Set<T>
  isSelectionMode: boolean
  toggleSelection: (item: T) => void
  selectItem: (item: T) => void
  deselectItem: (item: T) => void
  clearSelection: () => void
  selectAll: (items: T[]) => void
  toggleSelectionMode: (open?: boolean) => void
  isSelected: (item: T) => boolean
  getSelectedArray: () => T[]
}

const SelectionContext = createContext<ContextType<any> | undefined>(undefined)

export function SelectionProvider<T>({
  children,
}: {
  children: React.ReactNode
}) {
  const [selectedItems, setSelectedItems] = useState<Set<T>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const toggleSelection = (item: T) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(item)) {
        newSet.delete(item)
      } else {
        newSet.add(item)
      }
      return newSet
    })
  }

  const selectItem = (item: T) => {
    setSelectedItems(prev => new Set(prev).add(item))
  }

  const deselectItem = (item: T) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      newSet.delete(item)
      return newSet
    })
  }

  const clearSelection = () => {
    setSelectedItems(new Set())
  }

  const selectAll = (items: T[]) => {
    setSelectedItems(new Set(items))
  }

  const toggleSelectionMode = (open?: boolean) => {
    setIsSelectionMode(prev => {
      const newMode = open !== undefined ? open : !prev
      if (!newMode) {
        clearSelection()
      }
      return newMode
    })
  }

  const isSelected = (item: T) => {
    return selectedItems.has(item)
  }

  const getSelectedArray = () => {
    return Array.from(selectedItems)
  }

  return (
    <SelectionContext.Provider
      value={{
        selectedItems,
        isSelectionMode,
        toggleSelection,
        selectItem,
        deselectItem,
        clearSelection,
        selectAll,
        toggleSelectionMode,
        isSelected,
        getSelectedArray,
      }}
    >
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection<T>() {
  const context = useContext(SelectionContext)
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider')
  }
  return context as ContextType<T>
}
