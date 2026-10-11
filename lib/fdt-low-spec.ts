import type { AppSettings } from "@/types"

type LowSpecListener = () => void

type NetworkInformationLite = {
  saveData?: boolean
  effectiveType?: string
}

let adaptiveLowSpec = false
let adaptiveMonitorStarted = false
const lowSpecListeners = new Set<LowSpecListener>()

function emitLowSpecChange(): void {
  lowSpecListeners.forEach((listener) => listener())
}

function setAdaptiveLowSpec(next: boolean): void {
  if (adaptiveLowSpec === next) return
  adaptiveLowSpec = next
  emitLowSpecChange()
}

function shouldApplyStaticLowSpec(settings?: Partial<AppSettings> | null): boolean {
  if (typeof window === "undefined") return false
  if (settings?.lowSpecPerformanceMode) return true
  try {
    if (localStorage.getItem("famiapp-low-spec") === "1") return true
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true
  } catch {
    /* ignore */
  }
  if (isSlowOrSaveDataConnection()) return true
  const cores = navigator.hardwareConcurrency
  if (typeof cores === "number" && cores > 0 && cores <= 4) return true
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (typeof mem === "number" && mem > 0 && mem < 4) return true
  return false
}

function isSlowOrSaveDataConnection(): boolean {
  if (typeof navigator === "undefined") return false
  try {
    const conn = (navigator as Navigator & { connection?: NetworkInformationLite }).connection
    if (conn?.saveData) return true
    const t = conn?.effectiveType
    if (t === "slow-2g" || t === "2g" || t === "3g") return true
  } catch {
    /* ignore */
  }
  return false
}

/**
 * Weniger GPU-lastige UI (kein backdrop-blur, flacher Hintergrund, reduzierte Motion)
 * für schwache Tablets / Handys / WebViews. Aktiv durch Einstellung, System-Präferenz,
 * Heuristik (CPU/RAM, langsames Netz, Datensparmodus) oder
 * manuell: localStorage "famiapp-low-spec" === "1".
 */
export function shouldApplyLowSpec(settings?: Partial<AppSettings> | null): boolean {
  return shouldApplyStaticLowSpec(settings) || adaptiveLowSpec
}

export function subscribeLowSpec(listener: LowSpecListener): () => void {
  lowSpecListeners.add(listener)
  return () => {
    lowSpecListeners.delete(listener)
  }
}

export function startAdaptiveLowSpecMonitor(settings?: Partial<AppSettings> | null): void {
  if (typeof window === "undefined" || adaptiveMonitorStarted) return
  if (shouldApplyStaticLowSpec(settings)) return

  adaptiveMonitorStarted = true

  const MONITOR_DURATION_MS = 12_000
  const SAMPLE_WINDOW_MS = 2_000
  const LOW_FPS_THRESHOLD = 44
  const GOOD_FPS_THRESHOLD = 54
  const LONG_FRAME_MS = 75
  const LOW_WINDOWS_REQUIRED = 2
  const STABLE_WINDOWS_REQUIRED = 3

  let startTime = 0
  let windowStart = 0
  let lastFrame = 0
  let frames = 0
  let longFrames = 0
  let lowWindows = 0
  let stableWindows = 0

  const finish = () => {
    adaptiveMonitorStarted = false
  }

  const tick = (now: number) => {
    if (!startTime) {
      startTime = now
      windowStart = now
      lastFrame = now
      frames = 0
      window.requestAnimationFrame(tick)
      return
    }

    const frameDelta = now - lastFrame
    lastFrame = now
    frames++
    if (frameDelta >= LONG_FRAME_MS) longFrames++

    const elapsedWindow = now - windowStart
    if (elapsedWindow >= SAMPLE_WINDOW_MS) {
      const fps = (frames / elapsedWindow) * 1000
      const looksSlow = fps < LOW_FPS_THRESHOLD || longFrames >= 4

      if (looksSlow) {
        lowWindows++
        stableWindows = 0
      } else if (fps >= GOOD_FPS_THRESHOLD && longFrames === 0) {
        stableWindows++
        lowWindows = Math.max(0, lowWindows - 1)
      } else {
        lowWindows = Math.max(0, lowWindows - 1)
        stableWindows = 0
      }

      frames = 0
      longFrames = 0
      windowStart = now

      if (lowWindows >= LOW_WINDOWS_REQUIRED) {
        setAdaptiveLowSpec(true)
        finish()
        return
      }
      if (stableWindows >= STABLE_WINDOWS_REQUIRED || now - startTime >= MONITOR_DURATION_MS) {
        finish()
        return
      }
    }

    window.requestAnimationFrame(tick)
  }

  window.requestAnimationFrame(tick)
}

export function applyLowSpecClassToDocument(enabled: boolean): void {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("fdt-low-spec", enabled)
}
