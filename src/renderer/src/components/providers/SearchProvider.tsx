import React, { createContext, useContext, useState } from 'react'

interface SearchProvider {
  searchQuery: string
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
  isSearching: boolean
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>
  filterPath: string | null
  setFilterPath: React.Dispatch<React.SetStateAction<string | null>>
  filterTags: string[]
  setFilterTags: React.Dispatch<React.SetStateAction<string[]>>
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
  clearSearch: () => void
}

const SearchContext = createContext({} as SearchProvider)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [filterPath, setFilterPath] = useState<string | null>(null)
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [excludedTags, setExcludedTags] = useState<string[]>([])
  const [searchColor, setSearchColor] = useState<string | null>(null)
  const [aiSearchText, setAiSearchText] = useState('')
  const [aiSearchImage, setAiSearchImage] = useState<string | null>(null)
  const [isSearchDragging, setIsSearchDragging] = useState(false)

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearching(false)
    setFilterPath(null)
    setFilterTags([])
    setExcludedTags([])
    setSearchColor(null)
    setAiSearchText('')
    setAiSearchImage(null)
    setIsSearchDragging(false)
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
        clearSearch,
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
