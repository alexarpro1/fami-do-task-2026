"use client"

import { useCallback, useSyncExternalStore } from "react"
import { useFamily } from "@/context/family-context"
import { shouldApplyLowSpec, subscribeLowSpec } from "@/lib/fdt-low-spec"

/** Synchron zu `html.fdt-low-spec` — für Komponenten, die sich an schwachen Geräten anpassen sollen. */
export function useLowSpecPerformance(): boolean {
  const { state, isLoaded } = useFamily()

  const getSnapshot = useCallback(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("fdt-low-spec")) return true
    if (isLoaded) return shouldApplyLowSpec(state.settings)
    return false
  }, [isLoaded, state.settings])

  return useSyncExternalStore(subscribeLowSpec, getSnapshot, () => false)
}
