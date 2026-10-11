"use client"

import { useCallback, useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useSyncId } from "@/hooks/useSyncId"
import type { VideoItem, VideoType } from "@/types/video"
import {
  VIDEO_OFFLINE_INDEX_KEY,
  type OfflineVideoEntry,
  downloadMp4,
  getLocalVideoUri,
} from "@/lib/videos/offline"
import { listLocalCatalog } from "@/lib/videos/local-catalog"

const VIDEOS_CACHE_PREFIX = "famiapp-videos-cache-"

export type UseVideosStatus = "idle" | "loading" | "ready" | "error"

export type UseVideosResult = {
  videos: VideoItem[]
  status: UseVideosStatus
  error: string | null
  syncId: string
  refresh: () => Promise<void>
  downloadVideo: (video: VideoItem) => Promise<{ ok: boolean; error?: string }>
  isDownloadingId: string | null
}

type OfflineIndex = Record<string, OfflineVideoEntry>

type SupabaseVideoRow = {
  id: string
  sync_id?: string
  title?: string | null
  type?: string | null
  url?: string | null
  thumbnail_url?: string | null
  thumbnailUrl?: string | null
  duration_seconds?: number | null
  durationSeconds?: number | null
  storage_path?: string | null
  created_at?: string | null
  updated_at?: string | null
}

async function readOfflineIndex(): Promise<OfflineIndex> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import("@capacitor/preferences")
      const { value } = await Preferences.get({ key: VIDEO_OFFLINE_INDEX_KEY })
      if (value) return JSON.parse(value) as OfflineIndex
    }
  } catch {
    /* Preferences → localStorage */
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

function cacheKey(syncId: string): string {
  return `${VIDEOS_CACHE_PREFIX}${syncId}`
}

async function readCachedVideos(syncId: string): Promise<VideoItem[] | null> {
  if (!syncId) return null
  const key = cacheKey(syncId)
  try {
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import("@capacitor/preferences")
      const { value } = await Preferences.get({ key })
      if (value) return JSON.parse(value) as VideoItem[]
    }
  } catch {
    /* fall through */
  }
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as VideoItem[]
  } catch {
    return null
  }
}

async function writeCachedVideos(syncId: string, videos: VideoItem[]): Promise<void> {
  if (!syncId) return
  const key = cacheKey(syncId)
  const raw = JSON.stringify(videos)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, raw)
    } catch {
      /* quota */
    }
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import("@capacitor/preferences")
      await Preferences.set({ key, value: raw })
    } catch {
      /* ignore */
    }
  }
}

function normalizeType(raw: string | null | undefined, url: string): VideoType {
  const t = (raw || "").toLowerCase().trim()
  if (t === "youtube" || t === "mp4") return t
  if (/youtu\.?be/i.test(url)) return "youtube"
  return "mp4"
}

function mapRow(row: SupabaseVideoRow): VideoItem | null {
  const id = typeof row.id === "string" ? row.id : ""
  const url = typeof row.url === "string" ? row.url.trim() : ""
  if (!id || !url) return null
  const title = (row.title ?? "").trim() || id
  return {
    id,
    title,
    url,
    type: normalizeType(row.type, url),
    thumbnailUrl: row.thumbnail_url ?? row.thumbnailUrl ?? undefined,
    durationSeconds:
      typeof row.duration_seconds === "number"
        ? row.duration_seconds
        : typeof row.durationSeconds === "number"
          ? row.durationSeconds
          : undefined,
    source: "cloud",
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
  }
}

async function mergeCloudWithOffline(items: VideoItem[]): Promise<VideoItem[]> {
  const index = await readOfflineIndex()
  return Promise.all(
    items.map(async (item) => {
      if (item.source === "local") return item
      const entry = index[item.id]
      if (!entry) {
        return { ...item, source: item.source ?? "cloud", isDownloaded: false, localOfflinePath: undefined }
      }
      const uri = (await getLocalVideoUri(item.id)) ?? undefined
      return {
        ...item,
        source: item.source ?? "cloud",
        isDownloaded: Boolean(uri || entry.relativePath),
        localOfflinePath: uri ?? entry.relativePath,
      }
    }),
  )
}

/** Cloud-Einträge + lokaler Katalog; lokale IDs überschreiben keine Cloud-IDs bei Kollision. */
async function mergeCloudAndLocal(cloudItems: VideoItem[]): Promise<VideoItem[]> {
  const local = await listLocalCatalog()
  const cloudMerged = await mergeCloudWithOffline(cloudItems)
  const localIds = new Set(local.map((v) => v.id))
  const cloudOnly = cloudMerged.filter((v) => !localIds.has(v.id))
  return [...local, ...cloudOnly]
}

type UseVideosOptions = {
  /** Wenn false: kein Fetch/Cache (z. B. Feature-Toggle aus). Default true. */
  enabled?: boolean
}

/**
 * Lädt Videos aus Supabase (optional) und merged immer mit dem lokalen Geräte-Katalog.
 */
export function useVideos(options?: UseVideosOptions): UseVideosResult {
  const enabled = options?.enabled !== false
  const { syncId } = useSyncId()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [status, setStatus] = useState<UseVideosStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setVideos([])
      setStatus("idle")
      setError(null)
      return
    }

    const id = (syncId || "").trim().toUpperCase()
    setStatus("loading")
    setError(null)

    // Ohne Sync-ID / ohne Cloud: trotzdem lokale Bibliothek zeigen
    if (!id || !isSupabaseConfigured()) {
      try {
        const localOnly = await listLocalCatalog()
        if (!id) {
          setVideos(localOnly)
          setStatus("ready")
          setError(null)
          return
        }
        const cached = await readCachedVideos(id)
        const cloudPart = cached?.length ? await mergeCloudWithOffline(cached) : []
        const localIds = new Set(localOnly.map((v) => v.id))
        setVideos([...localOnly, ...cloudPart.filter((v) => !localIds.has(v.id))])
        setStatus("ready")
        setError(isSupabaseConfigured() ? null : "supabase_not_configured")
        return
      } catch (e) {
        setVideos([])
        setStatus("error")
        setError(e instanceof Error ? e.message : String(e))
        return
      }
    }

    try {
      const client = createClient()
      const { data, error: queryError } = await client
        .from("videos")
        .select("*")
        .eq("sync_id", id)
        .order("created_at", { ascending: false })

      if (queryError) {
        const cached = await readCachedVideos(id)
        const cloudPart = cached?.length ? cached : []
        setVideos(await mergeCloudAndLocal(cloudPart))
        setStatus("ready")
        setError(queryError.message || "fetch_failed")
        return
      }

      const mapped = ((data as SupabaseVideoRow[] | null) ?? [])
        .map(mapRow)
        .filter((v): v is VideoItem => v !== null)

      setVideos(await mergeCloudAndLocal(mapped))
      setStatus("ready")
      void writeCachedVideos(
        id,
        mapped.map(
          ({ isDownloaded: _d, localOfflinePath: _p, downloadProgress: _pr, ...rest }) => rest,
        ),
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const cached = await readCachedVideos(id)
      setVideos(await mergeCloudAndLocal(cached ?? []))
      setStatus("ready")
      setError(message)
    }
  }, [enabled, syncId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const downloadVideo = useCallback(
    async (video: VideoItem) => {
      if (!enabled) {
        return { ok: false, error: "videos_disabled" }
      }
      if (video.source === "local") {
        return { ok: true }
      }
      if (video.type !== "mp4") {
        return { ok: false, error: "youtube_not_supported" }
      }
      setIsDownloadingId(video.id)
      try {
        const result = await downloadMp4(video.url, video.id)
        if (!result.ok) {
          return { ok: false, error: result.error }
        }
        setVideos((prev) =>
          prev.map((v) =>
            v.id === video.id
              ? {
                  ...v,
                  isDownloaded: true,
                  localOfflinePath: result.uri,
                  downloadProgress: 100,
                }
              : v,
          ),
        )
        return { ok: true }
      } finally {
        setIsDownloadingId(null)
      }
    },
    [enabled],
  )

  return {
    videos,
    status,
    error,
    syncId: (syncId || "").trim().toUpperCase(),
    refresh,
    downloadVideo,
    isDownloadingId,
  }
}
