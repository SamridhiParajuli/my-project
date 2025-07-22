// Path: src/components/ui/SearchBar.tsx
import React from 'react';
import { cn } from '@/lib/utils';

// Simple search icon to avoid Lucide dependency
const SearchIcon = () => (
  <svg 
    className="h-4 w-4 text-gray-400" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
    />
  </svg>
);

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  onSearch?: (term: string) => void; // Added onSearch prop
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, containerClassName, onSearch, onChange, ...props }, ref) => {
    // Handle change to support both onChange and onSearch
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Call the original onChange if provided
      if (onChange) {
        onChange(e);
      }
      
      // Also call onSearch if provided
      if (onSearch) {
        onSearch(e.target.value);
      }
    };

    return (
      <div className={cn("relative w-full", containerClassName)}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="search"
          className={cn(
            "block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white",
            "focus:ring-1 focus:ring-accent focus:border-accent text-sm text-gray-900",
            "placeholder:text-gray-500",
            className
          )}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export { SearchBar };

// For backwards compatibility with components using default import
export default SearchBar;