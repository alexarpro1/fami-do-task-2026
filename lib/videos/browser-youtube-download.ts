/**
 * Browser: YouTube → MP4-Bytes vom lokalen Download-Server → IndexedDB.
 * Server: npm run youtube:server (wird mit npm run dev gestartet).
 */

import type { VideoDownloadQuality } from "@/types/video"

export const BROWSER_YT_DL_PORT = 47124
export const BROWSER_YT_DL_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_YT_DL_URL
    ? process.env.NEXT_PUBLIC_YT_DL_URL.replace(/\/$/, "")
    : `http://127.0.0.1:${BROWSER_YT_DL_PORT}`

export async function isBrowserYoutubeDownloadServerUp(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = window.setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch(`${BROWSER_YT_DL_BASE}/health`, {
      method: "GET",
      signal: ctrl.signal,
    })
    window.clearTimeout(t)
    if (!res.ok) return false
    const json = (await res.json()) as { ok?: boolean }
    return Boolean(json.ok)
  } catch {
    return false
  }
}

export async function fetchYoutubeInfoInBrowser(
  url: string,
): Promise<
  | { ok: true; info: { title?: string; durationSeconds?: number; thumbnailUrl?: string } }
  | { ok: false; error: string }
> {
  const up = await isBrowserYoutubeDownloadServerUp()
  if (!up) {
    return { ok: false, error: "browser_server_offline" }
  }
  try {
    const res = await fetch(`${BROWSER_YT_DL_BASE}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) {
      try {
        const err = (await res.json()) as { error?: string }
        return { ok: false, error: err.error || `http_${res.status}` }
      } catch {
        return { ok: false, error: `http_${res.status}` }
      }
    }
    const json = (await res.json()) as {
      ok?: boolean
      info?: { title?: string; durationSeconds?: number; thumbnailUrl?: string }
      error?: string
    }
    if (!json.ok) {
      return { ok: false, error: json.error || "get_info_failed" }
    }
    return { ok: true, info: json.info ?? {} }
  } catch {
    return { ok: false, error: "browser_server_offline" }
  }
}

export async function downloadYoutubeBlobInBrowser(
  url: string,
  quality: VideoDownloadQuality,
  onProgress?: (pct: number) => void,
): Promise<{ ok: true; blob: Blob } | { ok: false; error: string }> {
  onProgress?.(5)
  const up = await isBrowserYoutubeDownloadServerUp()
  if (!up) {
    return {
      ok: false,
      error: "browser_server_offline",
    }
  }

  onProgress?.(15)
  let res: Response
  try {
    res = await fetch(`${BROWSER_YT_DL_BASE}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, quality }),
    })
  } catch {
    return { ok: false, error: "browser_server_offline" }
  }

  if (!res.ok) {
    try {
      const err = (await res.json()) as { error?: string }
      return { ok: false, error: err.error || `http_${res.status}` }
    } catch {
      return { ok: false, error: `http_${res.status}` }
    }
  }

  const total = Number(res.headers.get("Content-Length") || 0)
  if (!res.body) {
    const blob = await res.blob()
    onProgress?.(100)
    if (!blob.size) return { ok: false, error: "empty_download" }
    return { ok: true, blob: new Blob([blob], { type: "video/mp4" }) }
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.length
      if (total > 0) {
        onProgress?.(Math.min(99, Math.round(15 + (received / total) * 80)))
      } else {
        onProgress?.(Math.min(90, 15 + chunks.length))
      }
    }
  }

  const blob = new Blob(chunks as BlobPart[], { type: "video/mp4" })
  onProgress?.(100)
  if (!blob.size) return { ok: false, error: "empty_download" }
  return { ok: true, blob }
}
