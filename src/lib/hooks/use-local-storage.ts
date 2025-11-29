
"use client"

import { useState, useEffect, useCallback } from 'react';

// A wrapper for window.localStorage that handles cleaning up on logout
const storage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event('local-storage'));
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.clear();
    window.dispatchEvent(new Event('local-storage'));
  }
}


export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  
  const handleStorageChange = useCallback((event?: StorageEvent | Event) => {
    if (typeof window === 'undefined') return;

    // Check if the event is a storage event and if the key matches
    if (event instanceof StorageEvent && event.key !== key) {
        return;
    }

    try {
        const item = storage.getItem(key);
        if (item === null) {
            // If item is null, it might have been cleared. Reset to initial.
             if (JSON.stringify(storedValue) !== JSON.stringify(initialValue)) {
                setStoredValue(initialValue);
             }
        } else {
             const parsedItem = JSON.parse(item);
             // Prevent infinite loops by checking if the value has actually changed
             if (JSON.stringify(storedValue) !== JSON.stringify(parsedItem)) {
                setStoredValue(parsedItem);
             }
        }
    } catch (error) {
        console.log(error);
    }
  }, [key, initialValue, storedValue]);

  useEffect(() => {
    if (typeof window !== "undefined") {
        window.addEventListener('storage', handleStorageChange); // For changes in other tabs
        window.addEventListener('local-storage', handleStorageChange); // For changes in the same tab
        
        // Initial sync
        handleStorageChange();

        return () => {
          window.removeEventListener('storage', handleStorageChange);
          window.removeEventListener('local-storage', handleStorageChange);
        };
    }
  }, [handleStorageChange]);


  return [storedValue, setValue];
}
