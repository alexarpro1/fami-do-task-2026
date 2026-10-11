/**
 * Lokale Persistenz für Video-Serien und Staffeln (Preferences / localStorage).
 * Löschen einer Serie/Staffel entfernt nur Zuordnungen – keine Mediendateien.
 */

import { Capacitor } from "@capacitor/core"
import type { VideoItem, VideoSeason, VideoSeries } from "@/types/video"
import { updateLocalCatalogEntry, listLocalCatalog } from "@/lib/videos/local-catalog"

export const SERIES_STORAGE_KEY = "famiapp-video-series"

export type SeriesCatalogState = {
  series: VideoSeries[]
  seasons: VideoSeason[]
}

const EMPTY: SeriesCatalogState = { series: [], seasons: [] }

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `series_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeState(raw: unknown): SeriesCatalogState {
  if (!raw || typeof raw !== "object") return { ...EMPTY, series: [], seasons: [] }
  const o = raw as Record<string, unknown>
  const seriesRaw = Array.isArray(o.series) ? o.series : []
  const seasonsRaw = Array.isArray(o.seasons) ? o.seasons : []
  const series: VideoSeries[] = []
  for (const item of seriesRaw) {
    if (!item || typeof item !== "object") continue
    const s = item as Record<string, unknown>
    const id = typeof s.id === "string" ? s.id.trim() : ""
    const title = typeof s.title === "string" ? s.title.trim() : ""
    if (!id || !title) continue
    series.push({
      id,
      title,
      sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : series.length,
      createdAt:
        typeof s.createdAt === "string" && s.createdAt
          ? s.createdAt
          : new Date().toISOString(),
      thumbnailUrl:
        typeof s.thumbnailUrl === "string" && s.thumbnailUrl.trim()
          ? s.thumbnailUrl.trim()
          : undefined,
    })
  }
  const seriesIds = new Set(series.map((s) => s.id))
  const seasons: VideoSeason[] = []
  for (const item of seasonsRaw) {
    if (!item || typeof item !== "object") continue
    const s = item as Record<string, unknown>
    const id = typeof s.id === "string" ? s.id.trim() : ""
    const seriesId = typeof s.seriesId === "string" ? s.seriesId.trim() : ""
    const title = typeof s.title === "string" ? s.title.trim() : ""
    if (!id || !seriesId || !seriesIds.has(seriesId) || !title) continue
    seasons.push({
      id,
      seriesId,
      title,
      seasonNumber:
        typeof s.seasonNumber === "number" && s.seasonNumber > 0
          ? Math.floor(s.seasonNumber)
          : seasons.filter((x) => x.seriesId === seriesId).length + 1,
      sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : seasons.length,
    })
  }
  series.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
  seasons.sort(
    (a, b) =>
      a.seriesId.localeCompare(b.seriesId) ||
      a.seasonNumber - b.seasonNumber ||
      a.sortOrder - b.sortOrder,
  )
  return { series, seasons }
}

async function readState(): Promise<SeriesCatalogState> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import("@capacitor/preferences")
      const { value } = await Preferences.get({ key: SERIES_STORAGE_KEY })
      if (value) return normalizeState(JSON.parse(value))
    }
  } catch {
    /* fallthrough */
  }
  if (typeof window === "undefined") return { series: [], seasons: [] }
  try {
    const raw = localStorage.getItem(SERIES_STORAGE_KEY)
    if (!raw) return { series: [], seasons: [] }
    return normalizeState(JSON.parse(raw))
  } catch {
    return { series: [], seasons: [] }
  }
}

async function writeState(state: SeriesCatalogState): Promise<void> {
  const normalized = normalizeState(state)
  const raw = JSON.stringify(normalized)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SERIES_STORAGE_KEY, raw)
    } catch {
      /* quota */
    }
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import("@capacitor/preferences")
      await Preferences.set({ key: SERIES_STORAGE_KEY, value: raw })
    } catch (e) {
      console.error("[videos/series-catalog] Preferences.set failed:", e)
    }
  }
}

export async function getSeriesCatalog(): Promise<SeriesCatalogState> {
  return readState()
}

export async function createSeries(title: string): Promise<VideoSeries> {
  const state = await readState()
  const trimmed = title.trim() || "Serie"
  const maxOrder = state.series.reduce((m, s) => Math.max(m, s.sortOrder), -1)
  const series: VideoSeries = {
    id: newId(),
    title: trimmed,
    sortOrder: maxOrder + 1,
    createdAt: new Date().toISOString(),
  }
  state.series.push(series)
  await writeState(state)
  return series
}

export async function renameSeries(seriesId: string, title: string): Promise<VideoSeries | null> {
  const state = await readState()
  const s = state.series.find((x) => x.id === seriesId)
  if (!s) return null
  const trimmed = title.trim()
  if (!trimmed) return s
  s.title = trimmed
  await writeState(state)
  return s
}

export async function deleteSeries(seriesId: string): Promise<boolean> {
  const state = await readState()
  const before = state.series.length
  state.series = state.series.filter((s) => s.id !== seriesId)
  const removedSeasonIds = new Set(
    state.seasons.filter((s) => s.seriesId === seriesId).map((s) => s.id),
  )
  state.seasons = state.seasons.filter((s) => s.seriesId !== seriesId)
  if (state.series.length === before) return false
  await writeState(state)

  const videos = await listLocalCatalog()
  await Promise.all(
    videos
      .filter((v) => v.seriesId === seriesId || (v.seasonId && removedSeasonIds.has(v.seasonId)))
      .map((v) =>
        updateLocalCatalogEntry(v.id, {
          seriesId: undefined,
          seasonId: undefined,
          episodeNumber: undefined,
        }),
      ),
  )
  return true
}

export async function createSeason(
  seriesId: string,
  title?: string,
  seasonNumber?: number,
): Promise<VideoSeason | null> {
  const state = await readState()
  if (!state.series.some((s) => s.id === seriesId)) return null
  const existing = state.seasons.filter((s) => s.seriesId === seriesId)
  const num =
    typeof seasonNumber === "number" && seasonNumber > 0
      ? Math.floor(seasonNumber)
      : existing.reduce((m, s) => Math.max(m, s.seasonNumber), 0) + 1
  const maxOrder = existing.reduce((m, s) => Math.max(m, s.sortOrder), -1)
  const season: VideoSeason = {
    id: newId(),
    seriesId,
    title: (title?.trim() || `Staffel ${num}`).trim(),
    seasonNumber: num,
    sortOrder: maxOrder + 1,
  }
  state.seasons.push(season)
  await writeState(state)
  return season
}

export async function renameSeason(seasonId: string, title: string): Promise<VideoSeason | null> {
  const state = await readState()
  const s = state.seasons.find((x) => x.id === seasonId)
  if (!s) return null
  const trimmed = title.trim()
  if (!trimmed) return s
  s.title = trimmed
  await writeState(state)
  return s
}

export async function deleteSeason(seasonId: string): Promise<boolean> {
  const state = await readState()
  const before = state.seasons.length
  state.seasons = state.seasons.filter((s) => s.id !== seasonId)
  if (state.seasons.length === before) return false
  await writeState(state)

  const videos = await listLocalCatalog()
  await Promise.all(
    videos
      .filter((v) => v.seasonId === seasonId)
      .map((v) =>
        updateLocalCatalogEntry(v.id, {
          seriesId: undefined,
          seasonId: undefined,
          episodeNumber: undefined,
        }),
      ),
  )
  return true
}

export async function assignVideoToSeason(params: {
  videoId: string
  seriesId: string
  seasonId: string
  episodeNumber?: number
}): Promise<boolean> {
  const state = await readState()
  const season = state.seasons.find((s) => s.id === params.seasonId)
  if (!season || season.seriesId !== params.seriesId) return false
  if (!state.series.some((s) => s.id === params.seriesId)) return false

  const videos = await listLocalCatalog()
  const inSeason = videos.filter((v) => v.seasonId === params.seasonId && v.id !== params.videoId)
  const ep =
    typeof params.episodeNumber === "number" && params.episodeNumber > 0
      ? Math.floor(params.episodeNumber)
      : inSeason.reduce((m, v) => Math.max(m, v.episodeNumber ?? 0), 0) + 1

  const updated = await updateLocalCatalogEntry(params.videoId, {
    seriesId: params.seriesId,
    seasonId: params.seasonId,
    episodeNumber: ep,
  })
  return Boolean(updated)
}

export async function unassignVideoFromSeries(videoId: string): Promise<boolean> {
  const updated = await updateLocalCatalogEntry(videoId, {
    seriesId: undefined,
    seasonId: undefined,
    episodeNumber: undefined,
  })
  return Boolean(updated)
}

export async function setEpisodeNumber(
  videoId: string,
  episodeNumber: number,
): Promise<boolean> {
  if (!Number.isFinite(episodeNumber) || episodeNumber < 1) return false
  const updated = await updateLocalCatalogEntry(videoId, {
    episodeNumber: Math.floor(episodeNumber),
  })
  return Boolean(updated)
}

export function seasonsForSeries(
  state: SeriesCatalogState,
  seriesId: string,
): VideoSeason[] {
  return state.seasons
    .filter((s) => s.seriesId === seriesId)
    .sort((a, b) => a.seasonNumber - b.seasonNumber || a.sortOrder - b.sortOrder)
}

/** Nächste Folge in derselben Staffel (nach episodeNumber, dann Titel). */
export function findNextEpisodeInSeason(
  videos: VideoItem[],
  current: Pick<VideoItem, "id" | "seasonId" | "episodeNumber" | "title">,
): VideoItem | null {
  const seasonId = current.seasonId?.trim()
  if (!seasonId) return null
  const ordered = videos
    .filter((v) => v.seasonId === seasonId)
    .sort((a, b) => {
      const ea = a.episodeNumber ?? Number.POSITIVE_INFINITY
      const eb = b.episodeNumber ?? Number.POSITIVE_INFINITY
      if (ea !== eb) return ea - eb
      return (a.title || "").localeCompare(b.title || "", undefined, {
        sensitivity: "base",
      })
    })
  const curIdx = ordered.findIndex((v) => v.id === current.id)
  if (curIdx < 0 || curIdx >= ordered.length - 1) return null
  return ordered[curIdx + 1] ?? null
}
