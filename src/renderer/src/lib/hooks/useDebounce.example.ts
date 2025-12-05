// Example usage of the debounce hooks

import { useDebounce, useDebouncedCallback, useUniversalDebounce, debounce } from './useDebounce';
import { useState, useCallback } from 'react';

// Example 1: Debouncing a value (e.g., search input)
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // This effect will only run when the debounced value changes
  // (300ms after the user stops typing)
  React.useEffect(() => {
    if (debouncedSearchTerm) {
      console.log('Searching for:', debouncedSearchTerm);
      // Perform search API call here
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
}

// Example 2: Debouncing a callback function
function ButtonComponent() {
  const handleClick = useCallback(() => {
    console.log('Button clicked!');
    // Expensive operation here
  }, []);

  const debouncedClick = useDebouncedCallback(handleClick, 1000);

  return (
    <button onClick={debouncedClick}>
      Click me (debounced)
    </button>
  );
}

// Example 3: Using the universal debounce hook
function UniversalExample() {
  const [value, setValue] = useState('');
  
  // Debouncing a value
  const debouncedValue = useUniversalDebounce(value, 500);
  
  // Debouncing a callback
  const handleSubmit = useCallback(() => {
    console.log('Form submitted!');
  }, []);
  
  const debouncedSubmit = useUniversalDebounce(handleSubmit, 1000);

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <p>Debounced value: {debouncedValue}</p>
      <button onClick={debouncedSubmit}>Submit</button>
    </div>
  );
}

// Example 4: Using the utility debounce function (non-hook)
function createDebouncedFunction() {
  const expensiveOperation = (data: string) => {
    console.log('Processing:', data);
    // Expensive operation
  };

  // Create a debounced version that can be used anywhere
  const debouncedOperation = debounce(expensiveOperation, 250);

  return debouncedOperation;
}

export {
  SearchComponent,
  ButtonComponent,
  UniversalExample,
  createDebouncedFunction
};
