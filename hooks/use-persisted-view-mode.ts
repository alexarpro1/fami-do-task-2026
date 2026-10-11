"use client"

import { useCallback, useMemo } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { ViewMode } from "@ui/components/view-mode-toggle"

function isViewMode(v: unknown): v is ViewMode {
  return v === "list" || v === "grid"
}

/**
 * Merkt Listen-/Kachelansicht pro Screen (localStorage + Capacitor Preferences).
 */
export function usePersistedViewMode(storageKey: string, defaultValue: ViewMode): [ViewMode, (next: ViewMode) => void] {
  const key = `famiapp-view-mode:${storageKey}`
  const [stored, setStored] = useLocalStorage<ViewMode>(key, defaultValue)

  const value = useMemo(() => (isViewMode(stored) ? stored : defaultValue), [stored, defaultValue])

  const setViewMode = useCallback(
    (next: ViewMode) => {
      setStored(next)
    },
    [setStored],
  )

  return [value, setViewMode]
}
