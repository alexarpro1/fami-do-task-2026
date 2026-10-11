"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { App as CapacitorApp } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { getBackButtonBlockEnabled } from "@/lib/kiosk"

/**
 * Hört auf den Android-Hardware-Zurück-Button.
 * Wenn „Zurück-Button blockieren“ aktiv ist: Auf Startseite (/) App nicht schließen; sonst history.back().
 * Wenn inaktiv: normales Verhalten (Startseite = App beenden, sonst zurück).
 */
export function BackButtonHandler() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined" || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return
    }

    const handler = CapacitorApp.addListener("backButton", async () => {
      const blockOnStart = await getBackButtonBlockEnabled()
      if (pathname === "/") {
        if (blockOnStart) return
        CapacitorApp.exitApp()
        return
      }
      if (window.history.length > 1) {
        window.history.back()
      } else {
        CapacitorApp.exitApp()
      }
    })

    return () => {
      handler.then((h) => h.remove())
    }
  }, [pathname])

  return null
}
