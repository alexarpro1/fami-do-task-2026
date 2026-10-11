"use client"

import { useEffect, useState } from "react"
import { SPLASH_MIN_MS } from "@/components/ui/loading-screen"

/**
 * Einmal pro Seitenladung (inkl. Refresh / neuer Tab).
 * Bei Client-Navigation (AppShell remount) nicht erneut – Flag lebt nur im JS-Runtime.
 */
let splashDoneThisPageLoad = false

/**
 * @returns true = Marken-Splash anzeigen
 */
export function useBrandSplash(isLoaded: boolean): boolean {
  const [holdMinTime, setHoldMinTime] = useState(!splashDoneThisPageLoad)

  useEffect(() => {
    if (splashDoneThisPageLoad) {
      setHoldMinTime(false)
      return
    }

    const t = window.setTimeout(() => {
      splashDoneThisPageLoad = true
      setHoldMinTime(false)
    }, SPLASH_MIN_MS)

    return () => window.clearTimeout(t)
  }, [])

  return !isLoaded || holdMinTime
}
