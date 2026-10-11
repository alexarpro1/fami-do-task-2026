"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

/**
 * Nach dieser Inaktivität: Hintergrund-Sync weniger aggressiv (keine Sicherheits-/Notification-Runner).
 * Ziel: reibungslos — Nutzer soll keine sichtbare „Drosselung“ spüren (Sync nutzt silent + verzögertes Wake).
 */
export const APP_IDLE_AFTER_MS = 10 * 60 * 1000

const TICK_MS = 30_000
const BUMP_THROTTLE_MS = 500

type AppActivityContextValue = {
  /** true, wenn seit APP_IDLE_AFTER_MS keine relevante Nutzeraktivität */
  isIdle: boolean
  lastActivityAt: number
  /** Für Tests oder manuelles „Wecksignal“ */
  bumpActivity: () => void
}

const AppActivityContext = createContext<AppActivityContextValue | null>(null)

export function AppActivityProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const lastActivityAtRef = useRef(Date.now())
  const [lastActivityAt, setLastActivityAt] = useState(() => lastActivityAtRef.current)
  const [isIdle, setIsIdle] = useState(false)

  const bumpActivity = useCallback(() => {
    const now = Date.now()
    if (now - lastActivityAtRef.current < BUMP_THROTTLE_MS) return
    lastActivityAtRef.current = now
    setLastActivityAt(now)
    setIsIdle(false)
  }, [])

  useEffect(() => {
    bumpActivity()
  }, [pathname, bumpActivity])

  useEffect(() => {
    if (typeof document === "undefined") return

    const onVis = () => {
      if (document.visibilityState === "visible") bumpActivity()
    }
    document.addEventListener("visibilitychange", onVis)

    const opts: AddEventListenerOptions = { capture: true, passive: true }
    const onInteract = () => bumpActivity()
    document.addEventListener("pointerdown", onInteract, opts)
    document.addEventListener("keydown", onInteract, opts)
    document.addEventListener("scroll", onInteract, opts)

    const tick = () => {
      const idle = Date.now() - lastActivityAtRef.current >= APP_IDLE_AFTER_MS
      setIsIdle((prev) => (prev === idle ? prev : idle))
    }
    tick()
    const id = window.setInterval(tick, TICK_MS)

    return () => {
      document.removeEventListener("visibilitychange", onVis)
      document.removeEventListener("pointerdown", onInteract, opts)
      document.removeEventListener("keydown", onInteract, opts)
      document.removeEventListener("scroll", onInteract, opts)
      window.clearInterval(id)
    }
  }, [bumpActivity])

  const value = useMemo<AppActivityContextValue>(
    () => ({ isIdle, lastActivityAt, bumpActivity }),
    [isIdle, lastActivityAt, bumpActivity]
  )

  return (
    <AppActivityContext.Provider value={value}>
      {children}
    </AppActivityContext.Provider>
  )
}

export function useAppActivity(): AppActivityContextValue {
  const ctx = useContext(AppActivityContext)
  if (!ctx) {
    return {
      isIdle: false,
      lastActivityAt: Date.now(),
      bumpActivity: () => {},
    }
  }
  return ctx
}
