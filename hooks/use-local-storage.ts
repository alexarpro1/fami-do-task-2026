// ============================================
// LOCAL STORAGE HOOK
// ============================================

"use client"

import { useState, useEffect, useCallback } from "react"

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  // Track if we've loaded from localStorage
  const [isLoaded, setIsLoaded] = useState(false)

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        const parsed = JSON.parse(item)
        setStoredValue(parsed)
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
    }
    setIsLoaded(true)
  }, [key])

  // Save to localStorage whenever value changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error)
      }
    },
    [key, storedValue],
  )

  return [storedValue, setValue, isLoaded]
}
