"use client"

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // This part runs only on the client, avoiding SSR issues.
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
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
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(new Event('local-storage')); // Notify other tabs/components
      }
    } catch (error) {
      console.error(error);
    }
  };
  
  // Listen for changes from other tabs
  const handleStorageChange = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
        const item = window.localStorage.getItem(key);
        if (item) {
            setStoredValue(JSON.parse(item));
        }
    } catch (error) {
        console.log(error);
    }
  }, [key]);

  useEffect(() => {
    // This effect should only run on the client.
    if (typeof window !== "undefined") {
        handleStorageChange(); // sync on initial mount
        window.addEventListener('local-storage', handleStorageChange);
        return () => {
          window.removeEventListener('local-storage', handleStorageChange);
        };
    }
  }, [handleStorageChange]);


  return [storedValue, setValue];
}
