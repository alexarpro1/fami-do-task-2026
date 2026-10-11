import { SPLASH_MIN_MS } from "@/components/ui/loading-screen"

type Listener = (visible: boolean) => void

const listeners = new Set<Listener>()
let hideTimer: ReturnType<typeof setTimeout> | null = null
let visible = false

function emit(next: boolean) {
  visible = next
  listeners.forEach((fn) => fn(next))
}

/** Splash erneut zeigen (z. B. nach Pull-to-Refresh). */
export function requestBrandSplash(durationMs: number = SPLASH_MIN_MS): void {
  if (typeof window === "undefined") return
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  emit(true)
  hideTimer = setTimeout(() => {
    hideTimer = null
    emit(false)
  }, Math.max(800, durationMs))
}

export function subscribeBrandSplash(listener: Listener): () => void {
  listeners.add(listener)
  if (visible) listener(true)
  return () => {
    listeners.delete(listener)
  }
}

export function isBrandSplashForcedVisible(): boolean {
  return visible
}
