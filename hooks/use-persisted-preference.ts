"use client"

import { useCallback } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"

/**
 * Persistierte UI-Präferenz (Sortierung, Filter, …) – überlebt App-Neustart
 * via localStorage + Capacitor Preferences.
 */
export function usePersistedPreference<T>(
  storageKey: string,
  defaultValue: T,
  isValid: (v: unknown) => v is T,
): [T, (next: T) => void] {
  const key = `famiapp-pref:${storageKey}`
  const [stored, setStored] = useLocalStorage<T>(key, defaultValue)
  const value = isValid(stored) ? stored : defaultValue

  const setValue = useCallback(
    (next: T) => {
      if (!isValid(next)) return
      setStored(next)
    },
    [isValid, setStored],
  )

  return [value, setValue]
}
