"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { useSyncRefresh } from "@/context/sync-refresh-context"

// ─── Konfiguration (zentral anpassbar) ─────────────────────────────────────
export const PULL_TO_REFRESH_CONFIG = {
  /** Mindest-Pull (px), ab dem Loslassen den Refresh auslöst */
  threshold: 72,
  /** Maximal sichtbare Pull-Höhe (px) */
  maxPull: 128,
  /** Widerstand beim Ziehen (0–1): wie viel vom Fingerweg als Pull gezählt wird */
  resistance: 0.5,
  /** Mindest-Fingerbewegung (px), bevor Pull gezählt wird */
  minDragStart: 12,
  /** Scroll-Toleranz (px): wenn Seite schon gescrollt ist, kein Pull-to-Refresh */
  scrollTolerance: 10,
  /** Höhe des sichtbaren Indikators während des Ladens (px) – muss Icon + Text + Padding fassen */
  indicatorHeight: 96,
  /** Anteil des Viewports für dynamische Werte (z. B. 0.12 = 12 %) */
  thresholdViewportFactor: 0.12,
  maxPullViewportFactor: 0.2,
} as const

/** Threshold abhängig von Viewport (für verschiedene Bildschirmgrößen). */
function getPullThreshold(): number {
  if (typeof window === "undefined") return PULL_TO_REFRESH_CONFIG.threshold
  const fromViewport = Math.round(window.innerHeight * PULL_TO_REFRESH_CONFIG.thresholdViewportFactor)
  return Math.max(PULL_TO_REFRESH_CONFIG.threshold, Math.min(96, fromViewport))
}

/** Max-Pull abhängig von Viewport. */
function getMaxPull(): number {
  if (typeof window === "undefined") return PULL_TO_REFRESH_CONFIG.maxPull
  const fromViewport = Math.round(window.innerHeight * PULL_TO_REFRESH_CONFIG.maxPullViewportFactor)
  return Math.max(PULL_TO_REFRESH_CONFIG.maxPull, Math.min(160, fromViewport))
}

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

/**
 * Pull-to-Refresh: Wischen von oben nach unten löst Sync aus.
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
    const { resistance, minDragStart, scrollTolerance } = PULL_TO_REFRESH_CONFIG

    const onTouchStart = (e: TouchEvent) => {
      if (getScrollTop() > scrollTolerance) return
      trackingRef.current = true
      startYRef.current = e.touches[0]!.clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!trackingRef.current || isRefreshingRef.current) return
      if (getScrollTop() > scrollTolerance) {
        trackingRef.current = false
        setPullY(0)
        return
      }
      const y = e.touches[0]!.clientY
      const delta = Math.max(0, y - startYRef.current)
      if (delta > minDragStart) e.preventDefault()
      const pull = Math.min(delta * resistance, maxPull)
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
  const threshold = typeof window !== "undefined" ? getPullThreshold() : PULL_TO_REFRESH_CONFIG.threshold
  const indicatorH = PULL_TO_REFRESH_CONFIG.indicatorHeight
  const contentHeight = Math.max(pullY, isRefreshing ? indicatorH : 0)
  const isReady = pullY >= threshold
  const progress = threshold > 0 ? Math.min(1, pullY / threshold) : 0

  if (!canRefresh) return null

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-40 overflow-hidden transition-[height,opacity] duration-200 ease-out"
      style={{
        height: showIndicator ? `calc(${contentHeight}px + env(safe-area-inset-top, 0px))` : 0,
        opacity: showIndicator ? 1 : 0,
      }}
      aria-hidden
    >
      <div
        className="flex min-h-0 flex-col rounded-b-2xl border-b border-border/60 bg-background/95 shadow-sm backdrop-blur-md"
        style={{
          marginTop: "env(safe-area-inset-top, 0px)",
          height: contentHeight,
          minHeight: contentHeight,
        }}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 overflow-hidden px-4 py-3 min-h-0">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
              isRefreshing
                ? "bg-primary/15 text-primary"
                : isReady
                  ? "bg-primary/15 text-primary ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
            }`}
            style={
              !isRefreshing && pullY > 0
                ? { transform: `scale(${0.88 + progress * 0.24})` }
                : undefined
            }
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
          </div>
          <span
            className={`text-center text-xs font-medium transition-colors ${
              isReady ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {isRefreshing
              ? "Aktualisiere…"
              : isReady
                ? "Loslassen zum Aktualisieren"
                : "Ziehen zum Aktualisieren"}
          </span>
        </div>
        {pullY > 0 && !isRefreshing && (
          <div
            className="h-0.5 w-full overflow-hidden rounded-b-2xl bg-muted/60"
            aria-hidden
          >
            <div
              className="h-full bg-primary/50 transition-all duration-75"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
