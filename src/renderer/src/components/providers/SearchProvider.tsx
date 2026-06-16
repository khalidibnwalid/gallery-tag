import React, { createContext, useContext, useState } from 'react'

export interface ImageFilter {
  text: string
  filterPath?: string
  tags: string[]
  tagMode: 'AND' | 'OR'
  excludedTags: string[]
  color?: string
  aiSearchText?: string
  aiSearchImage?: string
  createdStart?: string
  createdEnd?: string
  modifiedStart?: string
  modifiedEnd?: string
  sortBy?: 'createdAt' | 'modifiedAt' | 'fileName'
  sortOrder?: 'asc' | 'desc'
}

interface SearchProvider {
  searchQuery: string
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
  isSearching: boolean
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>
  filterPath: string | null
  setFilterPath: React.Dispatch<React.SetStateAction<string | null>>
  filterTags: string[]
  setFilterTags: React.Dispatch<React.SetStateAction<string[]>>
  tagMode: 'AND' | 'OR'
  setTagMode: React.Dispatch<React.SetStateAction<'AND' | 'OR'>>
  excludedTags: string[]
  setExcludedTags: React.Dispatch<React.SetStateAction<string[]>>
  searchColor: string | null
  setSearchColor: React.Dispatch<React.SetStateAction<string | null>>
  aiSearchText: string
  setAiSearchText: React.Dispatch<React.SetStateAction<string>>
  aiSearchImage: string | null
  setAiSearchImage: React.Dispatch<React.SetStateAction<string | null>>
  isSearchDragging: boolean
  setIsSearchDragging: React.Dispatch<React.SetStateAction<boolean>>
  createdStart: string
  setCreatedStart: React.Dispatch<React.SetStateAction<string>>
  createdEnd: string
  setCreatedEnd: React.Dispatch<React.SetStateAction<string>>
  modifiedStart: string
  setModifiedStart: React.Dispatch<React.SetStateAction<string>>
  modifiedEnd: string
  setModifiedEnd: React.Dispatch<React.SetStateAction<string>>
  sortBy: 'createdAt' | 'modifiedAt' | 'fileName'
  setSortBy: React.Dispatch<
    React.SetStateAction<'createdAt' | 'modifiedAt' | 'fileName'>
  >
  sortOrder: 'asc' | 'desc'
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>
  clearSearch: () => void
  filter: ImageFilter
}

const SearchContext = createContext({} as SearchProvider)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [filterPath, setFilterPath] = useState<string | null>(null)
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [tagMode, setTagMode] = useState<'AND' | 'OR'>('OR')
  const [excludedTags, setExcludedTags] = useState<string[]>([])
  const [searchColor, setSearchColor] = useState<string | null>(null)
  const [aiSearchText, setAiSearchText] = useState('')
  const [aiSearchImage, setAiSearchImage] = useState<string | null>(null)
  const [isSearchDragging, setIsSearchDragging] = useState(false)
  const [createdStart, setCreatedStart] = useState('')
  const [createdEnd, setCreatedEnd] = useState('')
  const [modifiedStart, setModifiedStart] = useState('')
  const [modifiedEnd, setModifiedEnd] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'modifiedAt' | 'fileName'>(
    'modifiedAt',
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const filter: ImageFilter = {
    text: searchQuery,
    filterPath: filterPath ?? undefined,
    tags: filterTags,
    tagMode,
    excludedTags,
    color: searchColor ?? undefined,
    aiSearchText: aiSearchText || undefined,
    aiSearchImage: aiSearchImage || undefined,
    createdStart: createdStart || undefined,
    createdEnd: createdEnd || undefined,
    modifiedStart: modifiedStart || undefined,
    modifiedEnd: modifiedEnd || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearching(false)
    setFilterPath(null)
    setFilterTags([])
    setTagMode('OR')
    setExcludedTags([])
    setSearchColor(null)
    setAiSearchText('')
    setAiSearchImage(null)
    setIsSearchDragging(false)
    setCreatedStart('')
    setCreatedEnd('')
    setModifiedStart('')
    setModifiedEnd('')
    setSortBy('fileName')
    setSortOrder('asc')
  }

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        isSearching,
        setIsSearching,
        filterPath,
        setFilterPath,
        filterTags,
        setFilterTags,
        tagMode,
        setTagMode,
        excludedTags,
        setExcludedTags,
        searchColor,
        setSearchColor,
        aiSearchText,
        setAiSearchText,
        aiSearchImage,
        setAiSearchImage,
        isSearchDragging,
        setIsSearchDragging,
        createdStart,
        setCreatedStart,
        createdEnd,
        setCreatedEnd,
        modifiedStart,
        setModifiedStart,
        modifiedEnd,
        setModifiedEnd,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        clearSearch,
        filter,
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}
