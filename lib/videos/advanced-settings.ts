import { Capacitor } from "@capacitor/core"

export const STORAGE_KEY = "famiapp-video-advanced-settings"

export type VideoAdvancedSettings = {
  /** Globales Sitzungslimit in Minuten; null = kein Default. */
  defaultWatchLimitMinutes: number | null
  /** YouTube-Downloads nur über WLAN (Native). */
  wifiOnlyDownloads: boolean
  /** Nach Ende nächste Folge in derselben Staffel starten. */
  autoplayNextEpisode: boolean
  /** Captions an, wenn Tracks vorhanden. */
  showCaptionsWhenAvailable: boolean
}

const DEFAULT_SETTINGS: VideoAdvancedSettings = {
  defaultWatchLimitMinutes: null,
  wifiOnlyDownloads: false,
  autoplayNextEpisode: false,
  showCaptionsWhenAvailable: false,
}

function normalizeLimit(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null
  const n = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(24 * 60, Math.floor(n))
}

function normalizeSettings(raw: unknown): VideoAdvancedSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS }
  const o = raw as Record<string, unknown>
  return {
    defaultWatchLimitMinutes: normalizeLimit(o.defaultWatchLimitMinutes),
    wifiOnlyDownloads: o.wifiOnlyDownloads === true,
    autoplayNextEpisode: o.autoplayNextEpisode === true,
    showCaptionsWhenAvailable: o.showCaptionsWhenAvailable === true,
  }
}

export async function getAdvancedSettings(): Promise<VideoAdvancedSettings> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import("@capacitor/preferences")
      const { value } = await Preferences.get({ key: STORAGE_KEY })
      if (value) return normalizeSettings(JSON.parse(value))
    }
  } catch {
    /* fallthrough */
  }
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function setAdvancedSettings(
  settings: VideoAdvancedSettings,
): Promise<void> {
  const normalized = normalizeSettings(settings)
  const raw = JSON.stringify(normalized)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, raw)
    } catch {
      /* quota */
    }
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import("@capacitor/preferences")
      await Preferences.set({ key: STORAGE_KEY, value: raw })
    } catch (e) {
      console.error("[videos/advanced-settings] Preferences.set failed:", e)
    }
  }
}

export function effectiveWatchLimitMinutes(
  videoLimit: number | undefined | null,
  defaults: Pick<VideoAdvancedSettings, "defaultWatchLimitMinutes">,
): number | undefined {
  if (typeof videoLimit === "number" && videoLimit > 0) return videoLimit
  if (
    typeof defaults.defaultWatchLimitMinutes === "number" &&
    defaults.defaultWatchLimitMinutes > 0
  ) {
    return defaults.defaultWatchLimitMinutes
  }
  return undefined
}
