// components/ui/SearchBar.tsx
import { useState, useEffect } from 'react'

interface SearchBarProps {
  onSearch: (searchTerm: string) => void
  placeholder?: string
  initialValue?: string
  className?: string
  debounceTime?: number
}

const SearchBar = ({
  onSearch,
  placeholder = 'Search...',
  initialValue = '',
  className = '',
  debounceTime = 300
}: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue)

  // Update search term when input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchTerm)
  }

  // Clear search input
  const handleClear = () => {
    setSearchTerm('')
    onSearch('')
  }

  // Debounce search to avoid too many requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, debounceTime)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm, debounceTime])

  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm !== initialValue) {
      onSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, onSearch, initialValue])

  return (
    <form 
      onSubmit={handleSubmit}
      className={`relative flex items-center ${className}`}
    >
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        placeholder={placeholder}
        className="form-input pl-10 pr-10 py-2 w-full rounded-lg border border-cream-300"
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-500">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-500 hover:text-dark-700"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </form>
  )
}

export default SearchBar