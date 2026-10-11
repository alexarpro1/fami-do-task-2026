/**
 * Offline-MP4-Downloads fuer native Capacitor-Apps.
 * Index-Key: famiapp-video-offline (Preferences, Fallback localStorage).
 * Dateien: Directory.Data / videos/{videoId}.mp4
 */

import { Capacitor } from "@capacitor/core"
import { isCapacitorNativeShell } from "@/lib/device"

export const VIDEO_OFFLINE_INDEX_KEY = "famiapp-video-offline"
const VIDEO_DIR = "videos"

export type OfflineVideoEntry = {
  videoId: string
  relativePath: string
  sourceUrl: string
  downloadedAt: string
}

type OfflineIndex = Record<string, OfflineVideoEntry>

export type DownloadMp4Result =
  | { ok: true; relativePath: string; uri: string }
  | { ok: false; error: string }

function relativePathFor(videoId: string): string {
  const safeId = videoId.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `${VIDEO_DIR}/${safeId}.mp4`
}

function isYoutubeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return (
      host === "youtu.be" ||
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host.endsWith(".youtube.com")
    )
  } catch {
    return /youtu\.?be/i.test(url)
  }
}

/** Nur echte MP4-URLs (Pfad/Query mit .mp4); YouTube und sonstige Streams ablehnen. */
export function isDownloadableMp4Url(videoUrl: string): boolean {
  const trimmed = videoUrl?.trim() ?? ""
  if (!trimmed) return false
  if (isYoutubeUrl(trimmed)) return false
  try {
    const u = new URL(trimmed)
    if (u.protocol !== "http:" && u.protocol !== "https:") return false
    const path = u.pathname.toLowerCase()
    if (path.endsWith(".mp4")) return true
    // Query-Parameter manchmal: …/file?name=clip.mp4
    if (u.search.toLowerCase().includes(".mp4")) return true
    return false
  } catch {
    return false
  }
}

async function readIndex(): Promise<OfflineIndex> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import("@capacitor/preferences")
      const { value } = await Preferences.get({ key: VIDEO_OFFLINE_INDEX_KEY })
      if (value) return JSON.parse(value) as OfflineIndex
    }
  } catch {
    /* Preferences fehlgeschlagen → localStorage */
  }
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(VIDEO_OFFLINE_INDEX_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as OfflineIndex
  } catch {
    return {}
  }
}

async function writeIndex(index: OfflineIndex): Promise<void> {
  const raw = JSON.stringify(index)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(VIDEO_OFFLINE_INDEX_KEY, raw)
    } catch {
      /* ignore quota */
    }
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import("@capacitor/preferences")
      await Preferences.set({ key: VIDEO_OFFLINE_INDEX_KEY, value: raw })
    } catch (e) {
      console.error("[videos/offline] Preferences.set failed:", e)
    }
  }
}

/**
 * Capacitor Android: mkdir wirft "Directory exists".
 * Web-Plugin: "Current directory does already exist."
 * "does not exist" / "doesn't exist" bleibt ein echter Fehler.
 */
export function isExistingDirectoryError(error: unknown): boolean {
  const msg = directoryErrorText(error).toLowerCase()
  if (!msg) return false
  if (msg.includes("not exist") || msg.includes("doesn't exist")) return false
  return (
    msg.includes("already exist") ||
    msg.includes("directory exists") ||
    msg.includes("file exists")
  )
}

function directoryErrorText(error: unknown): string {
  if (typeof error === "string") return error
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === "object") {
    const rec = error as { message?: unknown; errorMessage?: unknown }
    const parts: string[] = []
    if (typeof rec.message === "string" && rec.message) parts.push(rec.message)
    if (typeof rec.errorMessage === "string" && rec.errorMessage) parts.push(rec.errorMessage)
    if (parts.length > 0) return parts.join(" ")
  }
  return ""
}

async function ensureVideosDir(): Promise<void> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem")
  try {
    await Filesystem.mkdir({
      path: VIDEO_DIR,
      directory: Directory.Data,
      recursive: true,
    })
  } catch (e: unknown) {
    if (!isExistingDirectoryError(e)) throw e
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

/**
 * Lädt eine MP4-Datei nach Directory.Data/videos/{videoId}.mp4.
 * Nur nativ; Browser und YouTube werden mit Fehler abgelehnt (kein Fake-Erfolg).
 */
export async function downloadMp4(
  videoUrl: string,
  videoId: string,
): Promise<DownloadMp4Result> {
  if (!videoId?.trim()) {
    return { ok: false, error: "missing_video_id" }
  }
  if (!isDownloadableMp4Url(videoUrl)) {
    if (isYoutubeUrl(videoUrl)) {
      return { ok: false, error: "youtube_not_supported" }
    }
    return { ok: false, error: "not_mp4_url" }
  }
  if (!isCapacitorNativeShell()) {
    return { ok: false, error: "not_native" }
  }

  const relativePath = relativePathFor(videoId.trim())

  try {
    await ensureVideosDir()
    const response = await fetch(videoUrl.trim())
    if (!response.ok) {
      return { ok: false, error: `http_${response.status}` }
    }
    const contentType = (response.headers.get("content-type") || "").toLowerCase()
    if (
      contentType &&
      !contentType.includes("video/") &&
      !contentType.includes("application/octet-stream") &&
      !contentType.includes("mp4")
    ) {
      return { ok: false, error: "unexpected_content_type" }
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength === 0) {
      return { ok: false, error: "empty_body" }
    }

    const { Filesystem, Directory } = await import("@capacitor/filesystem")
    await Filesystem.writeFile({
      path: relativePath,
      data: arrayBufferToBase64(buffer),
      directory: Directory.Data,
      recursive: true,
    })

    const { uri } = await Filesystem.getUri({
      path: relativePath,
      directory: Directory.Data,
    })

    const index = await readIndex()
    index[videoId.trim()] = {
      videoId: videoId.trim(),
      relativePath,
      sourceUrl: videoUrl.trim(),
      downloadedAt: new Date().toISOString(),
    }
    await writeIndex(index)

    return { ok: true, relativePath, uri }
  } catch (e) {
    console.error("[videos/offline] downloadMp4 failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Liefert die native file://-URI, falls lokal vorhanden; sonst null. */
export async function getLocalVideoUri(videoId: string): Promise<string | null> {
  if (!videoId?.trim()) return null
  if (!isCapacitorNativeShell()) return null

  const index = await readIndex()
  const entry = index[videoId.trim()]
  const relativePath = entry?.relativePath ?? relativePathFor(videoId.trim())

  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem")
    await Filesystem.stat({
      path: relativePath,
      directory: Directory.Data,
    })
    const { uri } = await Filesystem.getUri({
      path: relativePath,
      directory: Directory.Data,
    })
    return uri ?? null
  } catch {
    return null
  }
}

/** Löscht lokale MP4-Datei und Index-Eintrag. */
export async function deleteLocalVideo(videoId: string): Promise<boolean> {
  if (!videoId?.trim()) return false
  if (!isCapacitorNativeShell()) return false

  const id = videoId.trim()
  const index = await readIndex()
  const relativePath = index[id]?.relativePath ?? relativePathFor(id)

  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem")
    try {
      await Filesystem.deleteFile({
        path: relativePath,
        directory: Directory.Data,
      })
    } catch {
      /* Datei fehlt bereits */
    }
    if (index[id]) {
      delete index[id]
      await writeIndex(index)
    }
    return true
  } catch (e) {
    console.error("[videos/offline] deleteLocalVideo failed:", e)
    return false
  }
}
