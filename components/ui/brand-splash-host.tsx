"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { subscribeBrandSplash } from "@/lib/brand-splash-controller"

/** Overlay-Splash für erneutes Anzeigen (Pull-to-Refresh etc.). */
export function BrandSplashHost() {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return subscribeBrandSplash(setVisible)
  }, [])

  if (!mounted || !visible) return null

  return createPortal(<LoadingScreen />, document.body)
}
