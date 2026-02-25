"use client"

import { useEffect, useState } from "react"

export function MobileSafeArea() {
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
  })

  useEffect(() => {
    // Detect safe area insets for mobile devices (notches, home indicators)
    const updateSafeArea = () => {
      const top = Number.parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-top") || "0",
      )
      const bottom = Number.parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-bottom") || "0",
      )
      setSafeAreaInsets({ top, bottom })

      // Apply to CSS variables
      document.documentElement.style.setProperty("--safe-area-top", `${top}px`)
      document.documentElement.style.setProperty("--safe-area-bottom", `${bottom}px`)
    }

    updateSafeArea()
    window.addEventListener("resize", updateSafeArea)
    return () => window.removeEventListener("resize", updateSafeArea)
  }, [])

  return null
}
