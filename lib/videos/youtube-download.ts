import { registerPlugin, type PluginListenerHandle } from "@capacitor/core"
import { isCapacitorNativeShell } from "@/lib/device"
import { getDownloadSettings } from "@/lib/videos/download-settings"
import type { VideoDownloadFormat, VideoDownloadQuality } from "@/types/video"

export type YoutubeDownloadProgressEvent = {
  videoId: string
  progress: number
  status?: string
}

export type YoutubeDownloadInfo = {
  title?: string
  durationSeconds?: number
  thumbnailUrl?: string
  /** yt-dlp dump-single-json (ältere APKs / Debug) */
  raw?: string
}

export interface YoutubeDownloadPlugin {
  init(): Promise<{ ok: boolean; error?: string }>
  download(options: {
    videoId: string
    url: string
    formatSelector: string
    format?: VideoDownloadFormat
  }): Promise<{ ok: boolean; path?: string; error?: string }>
  cancel(options: { videoId: string }): Promise<{ ok: boolean; error?: string }>
  getInfo(options: { url: string }): Promise<{ ok: boolean; info?: YoutubeDownloadInfo; error?: string }>
  addListener(
    eventName: "downloadProgress",
    listenerFunc: (event: YoutubeDownloadProgressEvent) => void
  ): Promise<PluginListenerHandle>
}

export const YoutubeDownload = registerPlugin<YoutubeDownloadPlugin>("YoutubeDownload")

export function mapQualityToFormatSelector(quality: VideoDownloadQuality): string {
  switch (quality) {
    case "best":
      return "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best"
    case "720p":
      return "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4][height<=720]/best[height<=720]"
    case "480p":
      return "bv*[ext=mp4][height<=480]+ba[ext=m4a]/b[ext=mp4][height<=480]/best[height<=480]"
    case "360p":
      return "bv*[ext=mp4][height<=360]+ba[ext=m4a]/b[ext=mp4][height<=360]/best[height<=360]"
    default:
      return "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4][height<=720]/best[height<=720]"
  }
}

type NativeResult<T> = { ok: true; data: T } | { ok: false; error: string }

function nativeOnly<T>(): NativeResult<T> {
  return { ok: false, error: "native_only" }
}

export async function youtubeDownloadInit(): Promise<NativeResult<{ ok: boolean }>> {
  if (!isCapacitorNativeShell()) return nativeOnly()
  try {
    const result = await YoutubeDownload.init()
    if (!result.ok) return { ok: false, error: result.error ?? "init_failed" }
    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function youtubeDownloadGetInfo(url: string): Promise<NativeResult<YoutubeDownloadInfo>> {
  if (!isCapacitorNativeShell()) return nativeOnly()
  try {
    const result = await YoutubeDownload.getInfo({ url })
    if (!result.ok) return { ok: false, error: result.error ?? "get_info_failed" }
    const info = (result.info ?? {}) as YoutubeDownloadInfo
    // Ältere Plugins legen raw auch top-level ab
    const topRaw = (result as { raw?: string }).raw
    if (!info.raw && typeof topRaw === "string") {
      info.raw = topRaw
    }
    return { ok: true, data: info }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function youtubeDownloadCancel(videoId: string): Promise<NativeResult<{ ok: boolean }>> {
  if (!isCapacitorNativeShell()) return nativeOnly()
  try {
    const result = await YoutubeDownload.cancel({ videoId })
    if (!result.ok) return { ok: false, error: result.error ?? "cancel_failed" }
    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function registerListeners(
  onProgress: (event: YoutubeDownloadProgressEvent) => void
): Promise<() => void> {
  if (!isCapacitorNativeShell()) return () => {}
  const handle = await YoutubeDownload.addListener("downloadProgress", onProgress)
  return () => {
    void handle.remove()
  }
}

/** @deprecated Nutze registerListeners */
export const registerYoutubeDownloadListeners = registerListeners

export async function startYoutubeDownload(
  videoId: string,
  url: string,
  quality?: VideoDownloadQuality,
  format?: VideoDownloadFormat
): Promise<{ ok: boolean; path?: string; error?: string }> {
  if (!isCapacitorNativeShell()) {
    return { ok: false, error: "native_only" }
  }

  const settings = await getDownloadSettings()
  const resolvedQuality = quality ?? settings.quality
  const resolvedFormat = format ?? settings.format
  const formatSelector = mapQualityToFormatSelector(resolvedQuality)

  try {
    const initResult = await YoutubeDownload.init()
    if (!initResult.ok) {
      return { ok: false, error: initResult.error ?? "init_failed" }
    }
    return await YoutubeDownload.download({
      videoId,
      url,
      formatSelector,
      format: resolvedFormat,
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
