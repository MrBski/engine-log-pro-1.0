
"use client"

import { useState, useEffect, useCallback } from 'react';

// This custom hook is being removed in favor of a direct state management
// approach in each component. This is a temporary step to prepare for 
// migrating the application's state management to Firebase Firestore.
// By centralizing state within the components, we can more easily replace
// it with Firestore-backed hooks like `useCollection` and `useDoc` later on,
// enabling real-time data synchronization and offline capabilities.

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    // This hook will no longer interact with localStorage.
    // The state will be component-local until Firestore is integrated.
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
  };
  
  return [storedValue, setValue];
}

    