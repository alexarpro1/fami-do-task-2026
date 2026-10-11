/**
 * Startet YouTube-Download:
 * - Native APK → yt-dlp Plugin
 * - Browser → lokaler Download-Server (youtubei.js) → IndexedDB
 */

import { isCapacitorNativeShell } from "@/lib/device"
import { isWifiOrBrowserOnline } from "@/lib/network"
import { getAdvancedSettings } from "@/lib/videos/advanced-settings"
import { downloadYoutubeBlobInBrowser } from "@/lib/videos/browser-youtube-download"
import { getDownloadSettings } from "@/lib/videos/download-settings"
import {
  getLocalCatalogEntry,
  markDownloadDone,
  markDownloadDoneWithBrowserBlob,
  markDownloadError,
  markDownloadProgress,
  updateLocalCatalogEntry,
} from "@/lib/videos/local-catalog"
import {
  registerYoutubeDownloadListeners,
  startYoutubeDownload,
} from "@/lib/videos/youtube-download"
import { fetchYoutubeVideoInfo } from "@/lib/videos/youtube-info"
import type { VideoDownloadFormat, VideoDownloadQuality } from "@/types/video"

async function durationMetaIfMissing(
  videoId: string,
  sourceUrl: string,
): Promise<{ durationSeconds?: number }> {
  try {
    const entry = await getLocalCatalogEntry(videoId)
    const hasDuration =
      typeof entry?.durationSeconds === "number" &&
      Number.isFinite(entry.durationSeconds) &&
      entry.durationSeconds > 0
    if (hasDuration) return {}
    const info = await fetchYoutubeVideoInfo(sourceUrl)
    if (
      info &&
      typeof info.durationSeconds === "number" &&
      Number.isFinite(info.durationSeconds) &&
      info.durationSeconds > 0
    ) {
      return { durationSeconds: Math.round(info.durationSeconds) }
    }
  } catch {
    /* soft */
  }
  return {}
}

export async function runLocalYoutubeDownload(
  videoId: string,
  sourceUrl: string,
  quality?: VideoDownloadQuality,
  format?: VideoDownloadFormat,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const settings = await getDownloadSettings()
  const advanced = await getAdvancedSettings()
  const q = quality ?? settings.quality
  const f = format ?? settings.format

  if (advanced.wifiOnlyDownloads) {
    const net = await isWifiOrBrowserOnline()
    if (!net.ok) {
      const err = net.isNative && net.connectionType !== "wifi" ? "wifi_only" : "offline"
      await markDownloadError(videoId, err)
      return { ok: false, error: err }
    }
  }

  await updateLocalCatalogEntry(videoId, {
    downloadStatus: "downloading",
    downloadProgress: 0,
    downloadQuality: q,
    downloadFormat: f,
    downloadError: undefined,
  })

  if (!isCapacitorNativeShell()) {
    try {
      const result = await downloadYoutubeBlobInBrowser(sourceUrl, q, (pct) => {
        void markDownloadProgress(videoId, pct)
      })
      if (!result.ok) {
        await markDownloadError(videoId, result.error)
        return { ok: false, error: result.error }
      }
      const meta = await durationMetaIfMissing(videoId, sourceUrl)
      const entry = await markDownloadDoneWithBrowserBlob(videoId, result.blob, meta)
      if (!entry) {
        await markDownloadError(videoId, "browser_storage_failed")
        return { ok: false, error: "browser_storage_failed" }
      }
      return { ok: true, path: entry.localOfflinePath }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e)
      await markDownloadError(videoId, err)
      return { ok: false, error: err }
    }
  }

  const unsub = await registerYoutubeDownloadListeners((ev) => {
    if (ev.videoId !== videoId) return
    void markDownloadProgress(videoId, ev.progress)
  })

  try {
    const result = await startYoutubeDownload(videoId, sourceUrl, q, f)
    if (!result.ok || !result.path) {
      const err = result.error || "download_failed"
      await markDownloadError(videoId, err)
      return { ok: false, error: err }
    }
    const meta = await durationMetaIfMissing(videoId, sourceUrl)
    await markDownloadDone(videoId, result.path, undefined, meta)
    return { ok: true, path: result.path }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    await markDownloadError(videoId, err)
    return { ok: false, error: err }
  } finally {
    unsub()
  }
}
