/**
 * YouTube-Metadaten (Dauer/Titel/Thumbnail) für Katalog-Einträge.
 * APK → Capacitor YoutubeDownload.getInfo (yt-dlp)
 * Browser → lokaler yt-Server POST /info (youtubei.js)
 */

import { isCapacitorNativeShell } from "@/lib/device"
import {
  fetchYoutubeInfoInBrowser,
} from "@/lib/videos/browser-youtube-download"
import {
  youtubeDownloadGetInfo,
  type YoutubeDownloadInfo,
} from "@/lib/videos/youtube-download"

export type YoutubeVideoInfo = YoutubeDownloadInfo

/** Parst yt-dlp `--dump-single-json` Output (auch teilweise / mit raw-Wrapper). */
export function parseYoutubeDlDumpJson(raw: unknown): YoutubeVideoInfo {
  if (raw == null) return {}
  let obj: Record<string, unknown> | null = null
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return {}
    try {
      obj = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      // Manchmal beginnt der Dump mit Log-Zeilen – erstes { … } suchen
      const start = trimmed.indexOf("{")
      const end = trimmed.lastIndexOf("}")
      if (start >= 0 && end > start) {
        try {
          obj = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
        } catch {
          return {}
        }
      } else {
        return {}
      }
    }
  } else if (typeof raw === "object") {
    obj = raw as Record<string, unknown>
  }
  if (!obj) return {}

  // Plugin kann { title, durationSeconds, thumbnailUrl, raw } liefern
  const nestedRaw = obj.raw
  if (typeof nestedRaw === "string" && nestedRaw.trim().startsWith("{")) {
    const fromNested = parseYoutubeDlDumpJson(nestedRaw)
    return mergeYoutubeInfoFields(
      {
        title: typeof obj.title === "string" ? obj.title : undefined,
        durationSeconds: normalizeDurationSeconds(obj.durationSeconds ?? obj.duration),
        thumbnailUrl:
          typeof obj.thumbnailUrl === "string"
            ? obj.thumbnailUrl
            : typeof obj.thumbnail === "string"
              ? obj.thumbnail
              : undefined,
      },
      fromNested,
    )
  }

  const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : undefined
  const durationSeconds = normalizeDurationSeconds(obj.durationSeconds ?? obj.duration)
  let thumbnailUrl: string | undefined
  if (typeof obj.thumbnailUrl === "string" && obj.thumbnailUrl.trim()) {
    thumbnailUrl = obj.thumbnailUrl.trim()
  } else if (typeof obj.thumbnail === "string" && obj.thumbnail.trim()) {
    thumbnailUrl = obj.thumbnail.trim()
  } else if (Array.isArray(obj.thumbnails) && obj.thumbnails.length > 0) {
    const last = obj.thumbnails[obj.thumbnails.length - 1] as { url?: string } | string
    if (typeof last === "string" && last.trim()) thumbnailUrl = last.trim()
    else if (last && typeof last === "object" && typeof last.url === "string") {
      thumbnailUrl = last.url.trim()
    }
  }

  return {
    ...(title ? { title } : {}),
    ...(durationSeconds != null ? { durationSeconds } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
  }
}

export function normalizeDurationSeconds(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return Math.round(n)
  }
  return undefined
}

/** Prefers primary fields; fills gaps from fallback. */
export function mergeYoutubeInfoFields(
  primary: YoutubeVideoInfo,
  fallback: YoutubeVideoInfo,
): YoutubeVideoInfo {
  return {
    title: primary.title?.trim() || fallback.title?.trim() || undefined,
    durationSeconds: primary.durationSeconds ?? fallback.durationSeconds,
    thumbnailUrl: primary.thumbnailUrl?.trim() || fallback.thumbnailUrl?.trim() || undefined,
  }
}

/**
 * Patch-Hilfe für Katalog-Einträge: nur leere Felder + duration wenn fehlend.
 * title/thumbnail nur setzen wenn bisher leer (bzw. Thumbnail fehlt).
 */
export function catalogPatchFromYoutubeInfo(
  current: { title?: string; thumbnailUrl?: string; durationSeconds?: number },
  info: YoutubeVideoInfo,
  options?: { replaceTitleIfEmpty?: boolean },
): Partial<{ title: string; thumbnailUrl: string; durationSeconds: number }> {
  const patch: Partial<{ title: string; thumbnailUrl: string; durationSeconds: number }> = {}
  const dur = normalizeDurationSeconds(info.durationSeconds)
  if (
    dur != null &&
    (typeof current.durationSeconds !== "number" ||
      !Number.isFinite(current.durationSeconds) ||
      current.durationSeconds <= 0)
  ) {
    patch.durationSeconds = dur
  }
  if (
    (options?.replaceTitleIfEmpty !== false) &&
    info.title?.trim() &&
    !current.title?.trim()
  ) {
    patch.title = info.title.trim()
  }
  if (info.thumbnailUrl?.trim() && !current.thumbnailUrl?.trim()) {
    patch.thumbnailUrl = info.thumbnailUrl.trim()
  }
  return patch
}

/**
 * Holt Metadaten online. Schlägt fehl → null (Caller addet Link trotzdem).
 */
export async function fetchYoutubeVideoInfo(url: string): Promise<YoutubeVideoInfo | null> {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    if (isCapacitorNativeShell()) {
      const result = await youtubeDownloadGetInfo(trimmed)
      if (!result.ok) return null
      const data = result.data as YoutubeDownloadInfo & { raw?: string }
      const fromFields: YoutubeVideoInfo = {
        title: data.title,
        durationSeconds: normalizeDurationSeconds(data.durationSeconds),
        thumbnailUrl: data.thumbnailUrl,
      }
      const fromRaw = data.raw ? parseYoutubeDlDumpJson(data.raw) : {}
      const merged = mergeYoutubeInfoFields(fromFields, fromRaw)
      if (!merged.title && !merged.durationSeconds && !merged.thumbnailUrl) return null
      return merged
    }

    const browser = await fetchYoutubeInfoInBrowser(trimmed)
    if (!browser.ok) return null
    const info = browser.info
    const normalized: YoutubeVideoInfo = {
      title: info.title?.trim() || undefined,
      durationSeconds: normalizeDurationSeconds(info.durationSeconds),
      thumbnailUrl: info.thumbnailUrl?.trim() || undefined,
    }
    if (!normalized.title && !normalized.durationSeconds && !normalized.thumbnailUrl) {
      return null
    }
    return normalized
  } catch {
    return null
  }
}
