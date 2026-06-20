import { useSearch } from '@/components/providers/SearchProvider'
import {
  useDeleteTagMutation,
  useRenameTagMutation,
  useSetTagParentMutation,
  useTags,
} from '@/lib/queries/tags'
import React, { createContext, useContext, useMemo, useState } from 'react'

export interface TagWithChildren {
  id: number
  name: string
  color?: string
  createdAt: string
  parentId?: number | null
  children: TagWithChildren[]
}

export interface TagsExplorerContextType {
  selectedTags: string[]
  excludedTags: string[]
  renamingTagId: number | null
  renameValue: string
  setRenameValue: (val: string) => void
  setRenamingTagId: (id: number | null) => void
  submitRename: () => void
  handleTagToggle: (name: string, event: React.MouseEvent<HTMLButtonElement>) => void
  handleRename: (node: TagWithChildren) => void
  handleDelete: (node: TagWithChildren) => void
  handleSetParent: (tagId: number, parentId: number | null) => void
  sortedTags: any[]
  isDescendant: (parentId: number, childId: number) => boolean
  dragOverId: number | 'root' | null
  setDragOverId: (id: number | 'root' | null) => void
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
  handleDragStart: (e: React.DragEvent, tagId: number) => void
  handleDragOver: (e: React.DragEvent, targetId: number | 'root' | null) => void
  handleDragLeave: () => void
  handleDragEnd: () => void
  handleDrop: (e: React.DragEvent, targetId: number | 'root' | null) => void
  isLoading: boolean
  filteredTree: TagWithChildren[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  tagMode: 'AND' | 'OR'
  setTagMode: (mode: 'AND' | 'OR') => void
  clearSelection: (e: React.MouseEvent) => void
  deleteTag: { id: number; name: string } | null
  setDeleteTag: (tag: { id: number; name: string } | null) => void
  confirmDelete: () => void
  expandedTagIds: Record<number, boolean>
  toggleExpand: (tagId: number) => void
  hoveredTagId: number | null
  setHoveredTagId: (id: number | null) => void
}

const TagsExplorerContext = createContext<TagsExplorerContextType | null>(null)

export function useTagsExplorer() {
  const context = useContext(TagsExplorerContext)
  if (!context) {
    throw new Error('useTagsExplorer must be used within a TagsExplorerProvider')
  }
  return context
}

export function TagsExplorerProvider({ children }: { children: React.ReactNode }) {
  const {
    filterTags: selectedTags = [],
    excludedTags = [],
    tagMode,
    setTagMode: onSetTagMode,
    setFilterTags: onSelectTags,
    setExcludedTags: onExcludeTags,
  } = useSearch()

  const [searchQuery, setSearchQuery] = useState('')
  const [renamingTagId, setRenamingTagId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTag, setDeleteTag] = useState<{ id: number; name: string } | null>(null)
  const [dragOverId, setDragOverId] = useState<number | 'root' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedTagIds, setExpandedTagIds] = useState<Record<number, boolean>>({})
  const [hoveredTagId, setHoveredTagId] = useState<number | null>(null)

  const toggleExpand = (tagId: number) => {
    setExpandedTagIds(prev => {
      const isCurrentlyExpanded = prev[tagId] !== false
      return { ...prev, [tagId]: !isCurrentlyExpanded }
    })
  }

  const { data: tags, isLoading } = useTags()
  const renameMutation = useRenameTagMutation()
  const deleteMutation = useDeleteTagMutation()
  const setParentMutation = useSetTagParentMutation()

  const sortedTags = useMemo(() => {
    if (!tags) return []
    return [...tags].sort((a, b) => a.name.localeCompare(b.name))
  }, [tags])

  const isDescendant = (parentId: number, childId: number): boolean => {
    if (!tags) return false
    const tagMap = new Map(tags.map(t => [t.id, t]))
    let current = tagMap.get(childId)
    while (current && current.parentId) {
      if (current.parentId === parentId) return true
      current = tagMap.get(current.parentId)
    }
    return false
  }

  const tagTree = useMemo(() => {
    if (!tags) return []

    const tagMap = new Map<number, TagWithChildren>()
    tags.forEach(tag => {
      tagMap.set(tag.id, { ...tag, children: [] })
    })

    const rootTags: TagWithChildren[] = []
    tagMap.forEach(tag => {
      if (tag.parentId && tagMap.has(tag.parentId)) {
        tagMap.get(tag.parentId)!.children.push(tag)
      } else {
        rootTags.push(tag)
      }
    })

    const sortTree = (nodes: TagWithChildren[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name))
      nodes.forEach(node => sortTree(node.children))
    }

    sortTree(rootTags)
    return rootTags
  }, [tags])

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tagTree

    const lowerQuery = searchQuery.toLowerCase()
    const filterTreeNodes = (nodes: TagWithChildren[]): TagWithChildren[] => {
      return nodes
        .map(node => {
          const filteredChildren = filterTreeNodes(node.children)
          const matchesSelf = node.name.toLowerCase().includes(lowerQuery)
          if (matchesSelf || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren }
          }
          return null
        })
        .filter((n): n is TagWithChildren => n !== null)
    }

    return filterTreeNodes(tagTree)
  }, [tagTree, searchQuery])

  const handleTagToggle = (
    tagName: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (!onSelectTags || !onExcludeTags) return

    const isSelected = selectedTags.includes(tagName)
    const isExcluded = excludedTags.includes(tagName)

    if (event.ctrlKey || event.metaKey) {
      onSelectTags(selectedTags.filter(t => t !== tagName))
      onExcludeTags(
        isExcluded
          ? excludedTags.filter(t => t !== tagName)
          : [...excludedTags, tagName],
      )
    } else if (isExcluded) {
      onExcludeTags(excludedTags.filter(t => t !== tagName))
    } else {
      onSelectTags(
        isSelected
          ? selectedTags.filter(t => t !== tagName)
          : [...selectedTags, tagName],
      )
    }
  }

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectTags?.([])
    onExcludeTags?.([])
  }

  const handleRename = (tag: { id: number; name: string }) => {
    // Delay slightly to let the context menu close and finish focus restoration
    setTimeout(() => {
      setRenamingTagId(tag.id)
      setRenameValue(tag.name)
    }, 50)
  }

  const submitRename = () => {
    if (renamingTagId !== null && renameValue.trim()) {
      renameMutation.mutate({
        tagId: renamingTagId,
        newName: renameValue.trim(),
      })
    }
    setRenamingTagId(null)
    setRenameValue('')
  }

  const handleDelete = (tag: { id: number; name: string }) => {
    setDeleteTag(tag)
  }

  const confirmDelete = () => {
    if (deleteTag) {
      deleteMutation.mutate({ tagId: deleteTag.id })
    }
    setDeleteTag(null)
  }

  const handleSetParent = (tagId: number, parentId: number | null) => {
    setParentMutation.mutate({ tagId, parentId })
  }

  const handleDragStart = (e: React.DragEvent, tagId: number) => {
    e.dataTransfer.setData('text/plain', tagId.toString())
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
    setHoveredTagId(null)
  }

  const handleDragOver = (e: React.DragEvent, targetId: number | 'root' | null) => {
    e.preventDefault()
    if (dragOverId !== targetId) {
      setDragOverId(targetId)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setTimeout(() => {
      setIsDragging(false)
      setDragOverId(null)
    }, 50)
  }

  const handleDrop = (e: React.DragEvent, targetId: number | 'root' | null) => {
    e.preventDefault()
    setDragOverId(null)
    setIsDragging(false)
    const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(draggedId)) return

    if (targetId === 'root' || targetId === null) {
      handleSetParent(draggedId, null)
      return
    }

    // Avoid dropping onto itself
    if (draggedId === targetId) return

    // Avoid circular references (dropping parent into its descendant)
    if (isDescendant(draggedId, targetId)) {
      console.warn('Blocked circular tag grouping')
      return
    }

    handleSetParent(draggedId, targetId)
  }

  const contextValue = useMemo<TagsExplorerContextType>(() => ({
    selectedTags,
    excludedTags,
    renamingTagId,
    renameValue,
    setRenameValue,
    setRenamingTagId,
    submitRename,
    handleTagToggle,
    handleRename,
    handleDelete,
    handleSetParent,
    sortedTags,
    isDescendant,
    dragOverId,
    setDragOverId,
    isDragging,
    setIsDragging,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    isLoading,
    filteredTree,
    searchQuery,
    setSearchQuery,
    tagMode,
    setTagMode: onSetTagMode,
    clearSelection,
    deleteTag,
    setDeleteTag,
    confirmDelete,
    expandedTagIds,
    toggleExpand,
    hoveredTagId,
    setHoveredTagId,
  }), [
    selectedTags,
    excludedTags,
    renamingTagId,
    renameValue,
    submitRename,
    handleTagToggle,
    handleRename,
    handleDelete,
    handleSetParent,
    sortedTags,
    isDescendant,
    dragOverId,
    setDragOverId,
    isDragging,
    setIsDragging,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    isLoading,
    filteredTree,
    searchQuery,
    tagMode,
    onSetTagMode,
    deleteTag,
    expandedTagIds,
    hoveredTagId,
  ])

  return (
    <TagsExplorerContext.Provider value={contextValue}>
      {children}
    </TagsExplorerContext.Provider>
  )
}
