import React, { createContext, useContext, useState } from 'react'

interface SearchProvider {
  searchQuery: string
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
  isSearching: boolean
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>
  clearSearch: () => void
}

const SearchContext = createContext({} as SearchProvider)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearching(false)
  }

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        isSearching,
        setIsSearching,
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
