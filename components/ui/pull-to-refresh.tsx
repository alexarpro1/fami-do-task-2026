"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { useSyncRefresh } from "@/context/sync-refresh-context"

/** Mindest-Pull (px), ab dem Loslassen den Refresh auslöst – abhängig von Viewport */
function getPullThreshold(): number {
  if (typeof window === "undefined") return 70
  return Math.max(56, Math.min(90, window.innerHeight * 0.12))
}

/** Maximal sichtbare Pull-Höhe (px) – abhängig von Viewport */
function getMaxPull(): number {
  if (typeof window === "undefined") return 120
  return Math.max(100, Math.min(140, window.innerHeight * 0.2))
}

/** Einheitliche Scroll-Position für alle Geräte (Browser, WebView, iOS/Android). */
function getScrollTop(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0
  return Math.max(
    0,
    window.scrollY ??
      window.pageYOffset ??
      document.documentElement.scrollTop ??
      (document.body ? document.body.scrollTop : 0) ??
      0
  )
}

const SCROLL_TOP_TOLERANCE = 8

/**
 * Pull-to-Refresh: Wischen von oben nach unten löst Sync-Abruf aus.
 * Funktioniert auf Touch-Geräten (Smartphone, Tablet) und bei Bedarf per Pointer (Touch-Laptops).
 * Nur aktiv, wenn Cloud-Sync (sync_id) konfiguriert ist.
 */
export function PullToRefresh() {
  const { refresh, isRefreshing, canRefresh } = useSyncRefresh()
  const [pullY, setPullY] = useState(0)
  const [visible, setVisible] = useState(false)
  const startYRef = useRef(0)
  const trackingRef = useRef(false)
  const pullYRef = useRef(0)
  const isRefreshingRef = useRef(false)
  pullYRef.current = pullY
  isRefreshingRef.current = isRefreshing

  const runRefresh = useCallback(async () => {
    setPullY(0)
    setVisible(true)
    await refresh()
    setVisible(false)
  }, [refresh])

  useEffect(() => {
    if (!canRefresh) return

    const threshold = getPullThreshold()
    const maxPull = getMaxPull()

    const onTouchStart = (e: TouchEvent) => {
      if (getScrollTop() > SCROLL_TOP_TOLERANCE) return
      trackingRef.current = true
      startYRef.current = e.touches[0]!.clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!trackingRef.current || isRefreshingRef.current) return
      if (getScrollTop() > SCROLL_TOP_TOLERANCE) {
        trackingRef.current = false
        setPullY(0)
        return
      }
      const y = e.touches[0]!.clientY
      const delta = Math.max(0, y - startYRef.current)
      if (delta > 15) e.preventDefault()
      const pull = Math.min(delta * 0.55, maxPull)
      pullYRef.current = pull
      setPullY(pull)
    }

    const onTouchEnd = () => {
      if (!trackingRef.current) return
      trackingRef.current = false
      const currentPull = pullYRef.current
      setPullY(0)
      if (currentPull >= threshold && !isRefreshingRef.current) {
        runRefresh()
      }
    }

    const onTouchCancel = () => {
      trackingRef.current = false
      setPullY(0)
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: false })
    document.addEventListener("touchend", onTouchEnd, { passive: true })
    document.addEventListener("touchcancel", onTouchCancel, { passive: true })

    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
      document.removeEventListener("touchcancel", onTouchCancel)
    }
  }, [canRefresh, runRefresh])

  const showIndicator = visible || isRefreshing || pullY > 0
  const threshold = typeof window !== "undefined" ? getPullThreshold() : 70
  const height = Math.max(pullY, isRefreshing ? 56 : 0)

  if (!canRefresh) return null

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex items-center justify-center overflow-hidden bg-background/90 backdrop-blur-sm transition-[height] duration-150"
      style={{
        height: showIndicator ? height : 0,
        opacity: showIndicator ? 1 : 0,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-1 py-2">
        {isRefreshing ? (
          <RefreshCw className="h-6 w-6 animate-spin text-primary" aria-hidden />
        ) : (
          <RefreshCw
            className="h-6 w-6 text-muted-foreground transition-transform duration-150"
            style={{ transform: pullY >= threshold ? "scale(1.15)" : `scale(${0.85 + (pullY / threshold) * 0.3})` }}
            aria-hidden
          />
        )}
        <span className="text-xs font-medium text-muted-foreground">
          {isRefreshing ? "Aktualisiere…" : pullY >= threshold ? "Loslassen zum Aktualisieren" : "Ziehen zum Aktualisieren"}
        </span>
      </div>
    </div>
  )
}
