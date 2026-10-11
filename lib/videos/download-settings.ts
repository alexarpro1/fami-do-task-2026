import { Capacitor } from "@capacitor/core"
import type { VideoDownloadFormat, VideoDownloadQuality } from "@/types/video"

export const STORAGE_KEY = "famiapp-video-download-settings"

export type VideoDownloadSettings = {
  quality: VideoDownloadQuality
  format: VideoDownloadFormat
}

const DEFAULT_SETTINGS: VideoDownloadSettings = {
  quality: "720p",
  format: "mp4",
}

function normalizeSettings(raw: unknown): VideoDownloadSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS }
  const o = raw as Record<string, unknown>
  const quality = o.quality
  const format = o.format
  const validQuality =
    quality === "best" || quality === "720p" || quality === "480p" || quality === "360p"
      ? quality
      : DEFAULT_SETTINGS.quality
  const validFormat = format === "mp4" ? format : DEFAULT_SETTINGS.format
  return { quality: validQuality, format: validFormat }
}

export async function getDownloadSettings(): Promise<VideoDownloadSettings> {
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

export async function setDownloadSettings(settings: VideoDownloadSettings): Promise<void> {
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
      console.error("[videos/download-settings] Preferences.set failed:", e)
    }
  }
}
