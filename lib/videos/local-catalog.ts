/**
 * Lokale Video-Bibliothek (Cloud-Fallback).
 * Katalog-Key: famiapp-video-catalog (Preferences → localStorage).
 * MP4-Dateien: Directory.Data / videos/{id}.mp4 (nativ) bzw. IndexedDB (Browser).
 */

import { Capacitor } from "@capacitor/core"
import { isCapacitorNativeShell } from "@/lib/device"
import type {
  VideoDownloadFormat,
  VideoDownloadQuality,
  VideoDownloadStatus,
  VideoItem,
  VideoStorageOrigin,
  VideoType,
} from "@/types/video"
import {
  deleteLocalVideo,
  getLocalVideoUri,
  isExistingDirectoryError,
} from "@/lib/videos/offline"
import {
  catalogPatchFromYoutubeInfo,
  fetchYoutubeVideoInfo,
} from "@/lib/videos/youtube-info"

export const VIDEO_CATALOG_KEY = "famiapp-video-catalog"
const VIDEO_DIR = "videos"
const IDB_NAME = "famiapp-video-blobs"
const IDB_STORE = "blobs"
export const MAX_LOCAL_MP4_BYTES = 80 * 1024 * 1024

export type LocalVideoCatalogEntry = {
  id: string
  title: string
  type: VideoType
  url: string
  localOfflinePath: string
  thumbnailUrl?: string
  createdAt: string
  source: "local"
  /** Browser: Blob liegt in IndexedDB unter dieser ID */
  browserBlob?: boolean
  downloadStatus?: VideoDownloadStatus
  downloadProgress?: number
  downloadQuality?: VideoDownloadQuality
  downloadFormat?: VideoDownloadFormat
  sourceUrl?: string
  sortOrder?: number
  seriesId?: string
  seasonId?: string
  episodeNumber?: number
  /** App-interne Aufrufe (nicht YouTube-Analytics) */
  viewCount?: number
  /** Aufrufe am Kalendertag `viewCountTodayDate` (Gerätezeit) */
  viewCountToday?: number
  /** ISO-Datum YYYY-MM-DD für `viewCountToday` */
  viewCountTodayDate?: string
  lastPositionSeconds?: number
  watchLimitMinutes?: number
  totalWatchedSeconds?: number
  downloadError?: string
  durationSeconds?: number
  fileSizeBytes?: number
  /**
   * Herkunft der lokalen Datei.
   * device-pick: Original vom Gerät – nie löschen/unlink.
   * app-download: App-Cache (yt-dlp / IDB-Blob vom Download).
   * link-only: nur Link, keine lokale Datei.
   */
  storageOrigin?: VideoStorageOrigin
}

/** Lokales Kalenderdatum YYYY-MM-DD (Gerätezeit). */
export function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Heutige App-Aufrufe; 0 wenn Datum nicht mehr heute. */
export function effectiveViewCountToday(entry: {
  viewCountToday?: number
  viewCountTodayDate?: string
}): number {
  if (!entry.viewCountTodayDate || entry.viewCountTodayDate !== todayIsoDate()) {
    return 0
  }
  return Math.max(0, entry.viewCountToday ?? 0)
}

type CatalogMap = Record<string, LocalVideoCatalogEntry>

export type LocalImportResult =
  | { ok: true; entry: LocalVideoCatalogEntry; video: VideoItem }
  | { ok: false; error: string }

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

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

/** YouTube-Video-ID aus Watch-, Shorts-, Embed- oder youtu.be-URLs. */
export function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed)
    const host = u.hostname.replace(/^www\./, "").toLowerCase()
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0] || ""
      return id || null
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const fromQuery = u.searchParams.get("v")
      if (fromQuery) return fromQuery
      for (const prefix of ["/embed/", "/shorts/", "/live/"]) {
        if (u.pathname.startsWith(prefix)) {
          const id = u.pathname.slice(prefix.length).split("/")[0] || ""
          if (id) return id
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/** Standard-Thumbnail (hqdefault) für YouTube-URLs. */
export function youtubeThumbnailFromUrl(url: string): string | undefined {
  const id = extractYoutubeVideoId(url)
  if (!id) return undefined
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

/** Anzeige-Hilfe für Dateigröße (z. B. Galerie-Liste). */
export function formatVideoFileSize(bytes?: number): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return null
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"] as const
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${units[unit]}`
}

export function isValidYoutubeUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim())
    const host = u.hostname.replace(/^www\./, "").toLowerCase()
    if (host === "youtu.be") return u.pathname.length > 1
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      return (
        u.searchParams.has("v") ||
        u.pathname.startsWith("/embed/") ||
        u.pathname.startsWith("/shorts/") ||
        u.pathname.startsWith("/live/")
      )
    }
    return false
  } catch {
    return false
  }
}

/** Direkte Medien-URLs: .mp4, .webm, .m3u8 (Query-String erlaubt). */
export function isValidDirectVideoUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== "http:" && u.protocol !== "https:") return false
    const path = u.pathname.toLowerCase()
    return path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".m3u8")
  } catch {
    return false
  }
}

/** YouTube-Watch/Shorts/Embed oder direkte Video-URL. */
export function isValidPlayableVideoUrl(raw: string): boolean {
  return isValidYoutubeUrl(raw) || isValidDirectVideoUrl(raw)
}

function videoTypeForUrl(url: string): VideoType {
  return isValidYoutubeUrl(url) ? "youtube" : "mp4"
}

function nextSortOrder(map: CatalogMap): number {
  let max = -1
  for (const entry of Object.values(map)) {
    if (typeof entry.sortOrder === "number" && entry.sortOrder > max) {
      max = entry.sortOrder
    }
  }
  return max + 1
}

function compareCatalogEntries(a: LocalVideoCatalogEntry, b: LocalVideoCatalogEntry): number {
  const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER
  const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER
  if (ao !== bo) return ao - bo
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
}

function entryHasLocalFile(entry: LocalVideoCatalogEntry): boolean {
  return Boolean(entry.localOfflinePath?.trim() || entry.browserBlob)
}

/**
 * Ermittelt die Speicher-Herkunft (explizit oder Legacy-Heuristik).
 * YouTube-sourceUrl → App-Download/Link; MP4 ohne YouTube-Quelle → Geräte-Auswahl.
 */
export function resolveStorageOrigin(
  entry: Pick<
    LocalVideoCatalogEntry,
    | "storageOrigin"
    | "sourceUrl"
    | "type"
    | "localOfflinePath"
    | "browserBlob"
    | "downloadStatus"
  >,
): VideoStorageOrigin {
  const explicit = entry.storageOrigin
  if (explicit === "app-download" || explicit === "device-pick" || explicit === "link-only") {
    return explicit
  }

  const hasFile = Boolean(entry.localOfflinePath?.trim() || entry.browserBlob)
  const sourceUrl = entry.sourceUrl?.trim() ?? ""
  if (sourceUrl && isYoutubeUrl(sourceUrl)) {
    return hasFile || entry.downloadStatus === "done" ? "app-download" : "link-only"
  }

  if (entry.type === "youtube") {
    return hasFile ? "app-download" : "link-only"
  }

  // MP4 ohne YouTube-sourceUrl: vom Gerät gewählt / importiert
  if (entry.type === "mp4") return "device-pick"

  return "link-only"
}

/** „Speicher leeren“ nur für App-Downloads mit lokaler Datei. */
export function canClearLocalVideoStorage(
  entry: Pick<
    LocalVideoCatalogEntry,
    | "storageOrigin"
    | "sourceUrl"
    | "type"
    | "localOfflinePath"
    | "browserBlob"
    | "downloadStatus"
  >,
): boolean {
  const hasFile = Boolean(entry.localOfflinePath?.trim() || entry.browserBlob)
  return resolveStorageOrigin(entry) === "app-download" && hasFile
}

/** Pfad liegt unter App-Data (videos/{id}.mp4) bzw. IDB – kein externes Geräte-Original. */
function isAppManagedMediaPath(path: string, videoId: string): boolean {
  const trimmed = path.trim()
  if (!trimmed) return false
  if (trimmed.startsWith("idb:")) return true
  if (trimmed.startsWith("content:")) return false
  const rel = relativePathFor(videoId)
  if (trimmed === rel || trimmed.endsWith(`/${rel}`) || trimmed.endsWith(`\\${rel}`)) return true
  // Relative App-Pfade ohne Schema/Absolutpfad
  if (
    !trimmed.startsWith("file") &&
    !trimmed.startsWith("/") &&
    !/^[A-Za-z]:[\\/]/.test(trimmed) &&
    (trimmed.startsWith(`${VIDEO_DIR}/`) || trimmed.startsWith(`${VIDEO_DIR}\\`))
  ) {
    return true
  }
  return false
}

function entryIsDownloaded(entry: LocalVideoCatalogEntry): boolean {
  if (entry.downloadStatus === "done") return entryHasLocalFile(entry)
  if (entry.type === "mp4" && entryHasLocalFile(entry)) {
    return entry.downloadStatus !== "queued" && entry.downloadStatus !== "downloading"
  }
  return false
}

async function patchCatalogEntry(
  videoId: string,
  patch: Partial<Omit<LocalVideoCatalogEntry, "id">>
): Promise<LocalVideoCatalogEntry | null> {
  const id = videoId.trim()
  if (!id) return null
  const map = await readCatalogMap()
  const entry = map[id]
  if (!entry) return null
  const next: LocalVideoCatalogEntry = { ...entry, ...patch }
  // Explizit entfernen, damit JSON-Persistenz Keys nicht behält
  for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
    if (patch[key] === undefined) {
      delete (next as Record<string, unknown>)[key as string]
    }
  }
  map[id] = next
  await writeCatalogMap(map)
  return next
}

async function readCatalogMap(): Promise<CatalogMap> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import("@capacitor/preferences")
      const { value } = await Preferences.get({ key: VIDEO_CATALOG_KEY })
      if (value) return JSON.parse(value) as CatalogMap
    }
  } catch {
    /* fallthrough */
  }
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(VIDEO_CATALOG_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CatalogMap
  } catch {
    return {}
  }
}

async function writeCatalogMap(map: CatalogMap): Promise<void> {
  const raw = JSON.stringify(map)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(VIDEO_CATALOG_KEY, raw)
    } catch {
      /* quota */
    }
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import("@capacitor/preferences")
      await Preferences.set({ key: VIDEO_CATALOG_KEY, value: raw })
    } catch (e) {
      console.error("[videos/local-catalog] Preferences.set failed:", e)
    }
  }
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("idb_unavailable"))
      return
    }
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("idb_open_failed"))
  })
}

async function idbPutBlob(id: string, blob: Blob): Promise<void> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite")
    tx.objectStore(IDB_STORE).put(blob, id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error("idb_put_failed"))
    }
  })
}

async function idbGetBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openIdb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly")
      const req = tx.objectStore(IDB_STORE).get(id)
      req.onsuccess = () => {
        db.close()
        resolve((req.result as Blob | undefined) ?? null)
      }
      req.onerror = () => {
        db.close()
        reject(req.error ?? new Error("idb_get_failed"))
      }
    })
  } catch {
    return null
  }
}

async function idbDeleteBlob(id: string): Promise<void> {
  try {
    const db = await openIdb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite")
      tx.objectStore(IDB_STORE).delete(id)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error("idb_delete_failed"))
      }
    })
  } catch {
    /* ignore */
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

type NativeVideoFsModule = {
  Filesystem: {
    mkdir(options: { path: string; directory?: string; recursive?: boolean }): Promise<unknown>
    writeFile(options: {
      path: string
      data: string
      directory?: string
      recursive?: boolean
    }): Promise<unknown>
    getUri(options: { path: string; directory?: string }): Promise<{ uri?: string }>
  }
  Directory: { Data: string }
}

let nativeVideoFsForTests: NativeVideoFsModule | null = null

/** Node-Tests: ersetzt das native Filesystem. null stellt das Capacitor-Plugin wieder her. */
export function setNativeVideoFilesystemForTests(fs: NativeVideoFsModule | null): void {
  nativeVideoFsForTests = fs
}

async function loadNativeVideoFilesystem(): Promise<NativeVideoFsModule> {
  if (nativeVideoFsForTests) return nativeVideoFsForTests
  const mod = await import("@capacitor/filesystem")
  return {
    Filesystem: mod.Filesystem as NativeVideoFsModule["Filesystem"],
    Directory: { Data: mod.Directory.Data },
  }
}

async function ensureVideosDir(): Promise<void> {
  const { Filesystem, Directory } = await loadNativeVideoFilesystem()
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

export function catalogEntryToVideoItem(entry: LocalVideoCatalogEntry): VideoItem {
  const hasLocalFile = entryHasLocalFile(entry)
  return {
    id: entry.id,
    title: entry.title,
    url: entry.url || (hasLocalFile ? entry.localOfflinePath : ""),
    type: entry.type,
    thumbnailUrl: entry.thumbnailUrl,
    durationSeconds: entry.durationSeconds,
    localOfflinePath: hasLocalFile ? entry.localOfflinePath : undefined,
    downloadProgress: entry.downloadProgress,
    isDownloaded: entryIsDownloaded(entry),
    source: "local",
    downloadStatus: entry.downloadStatus,
    downloadQuality: entry.downloadQuality,
    downloadFormat: entry.downloadFormat,
    sourceUrl: entry.sourceUrl,
    storageOrigin: resolveStorageOrigin(entry),
    sortOrder: entry.sortOrder,
    seriesId: entry.seriesId,
    seasonId: entry.seasonId,
    episodeNumber: entry.episodeNumber,
    viewCount: entry.viewCount,
    viewCountToday: entry.viewCountToday,
    viewCountTodayDate: entry.viewCountTodayDate,
    lastPositionSeconds: entry.lastPositionSeconds,
    watchLimitMinutes: entry.watchLimitMinutes,
    totalWatchedSeconds: entry.totalWatchedSeconds,
    downloadError: entry.downloadError,
    fileSizeBytes: entry.fileSizeBytes,
    createdAt: entry.createdAt,
  }
}

/** Alle lokalen Katalog-Einträge als VideoItem[]. */
export async function listLocalCatalog(): Promise<VideoItem[]> {
  const map = await readCatalogMap()
  return Object.values(map).sort(compareCatalogEntries).map(catalogEntryToVideoItem)
}

/** Einzelner Katalog-Eintrag (roh) oder null. */
export async function getLocalCatalogEntry(
  videoId: string,
): Promise<LocalVideoCatalogEntry | null> {
  const id = videoId.trim()
  if (!id) return null
  const map = await readCatalogMap()
  return map[id] ?? null
}

/** Abspiel-URI: nativ file:// / convertFileSrc; Browser blob: aus IndexedDB. */
export async function getLocalPlaybackUrl(videoId: string): Promise<string | null> {
  if (!videoId?.trim()) return null
  const map = await readCatalogMap()
  const entry = map[videoId.trim()]
  if (!entry) return null

  const offline = entry.localOfflinePath?.trim() || ""
  // Absolute Pfade vom yt-dlp-Plugin (filesDir)
  if (offline.startsWith("file://") || offline.startsWith("/") || /^[A-Za-z]:[\\/]/.test(offline)) {
    return offline.startsWith("file://") ? offline : `file://${offline}`
  }

  if (entry.type !== "mp4" && entry.downloadStatus !== "done") {
    return getLocalVideoUri(videoId)
  }

  if (isCapacitorNativeShell()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem")
      const path = offline || relativePathFor(entry.id)
      await Filesystem.stat({ path, directory: Directory.Data })
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Data })
      return uri ?? null
    } catch {
      return null
    }
  }

  if (entry.browserBlob) {
    const blob = await idbGetBlob(entry.id)
    if (!blob) return null
    return URL.createObjectURL(blob)
  }

  return null
}

/**
 * Speichert einen YouTube- oder direkten Video-Link nur lokal (nie Cloud).
 * type: youtube | mp4 je nach URL.
 * YouTube online: getInfo soft (Dauer + Titel/Thumbnail wenn leer) – Fehler blockiert nicht.
 */
export async function addLocalVideoLink(title: string, url: string): Promise<LocalImportResult> {
  const trimmedTitle = title.trim()
  const trimmedUrl = url.trim()
  if (!trimmedTitle) return { ok: false, error: "title_required" }
  if (!trimmedUrl) return { ok: false, error: "url_required" }
  if (!isValidPlayableVideoUrl(trimmedUrl)) return { ok: false, error: "url_invalid" }

  const id = newId()
  const type = videoTypeForUrl(trimmedUrl)
  const isYoutube = type === "youtube"
  const map = await readCatalogMap()
  const youtubeThumb = isYoutube ? youtubeThumbnailFromUrl(trimmedUrl) : undefined

  let resolvedTitle = trimmedTitle
  let thumbnailUrl = youtubeThumb
  let durationSeconds: number | undefined

  if (isYoutube) {
    try {
      const info = await fetchYoutubeVideoInfo(trimmedUrl)
      if (info) {
        // Titel vom User behalten; Thumbnail oft schon via hqdefault gesetzt
        const patch = catalogPatchFromYoutubeInfo(
          { title: resolvedTitle, thumbnailUrl, durationSeconds },
          info,
        )
        if (patch.durationSeconds != null) durationSeconds = patch.durationSeconds
        if (patch.thumbnailUrl) thumbnailUrl = patch.thumbnailUrl
        if (patch.title) resolvedTitle = patch.title
      }
    } catch {
      /* soft fail – Link trotzdem speichern */
    }
  }

  const entry: LocalVideoCatalogEntry = {
    id,
    title: resolvedTitle,
    type,
    url: trimmedUrl,
    localOfflinePath: "",
    createdAt: new Date().toISOString(),
    source: "local",
    sortOrder: nextSortOrder(map),
    ...(typeof durationSeconds === "number" ? { durationSeconds } : {}),
    ...(isYoutube
      ? {
          downloadStatus: "queued" as const,
          sourceUrl: trimmedUrl,
          storageOrigin: "link-only" as const,
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
        }
      : { downloadStatus: "idle" as const, storageOrigin: "link-only" as const }),
  }
  map[id] = entry
  await writeCatalogMap(map)
  return { ok: true, entry, video: catalogEntryToVideoItem(entry) }
}

/** @deprecated Nutze addLocalVideoLink – bleibt für Kompatibilität. */
export async function addLocalYoutube(title: string, url: string): Promise<LocalImportResult> {
  return addLocalVideoLink(title, url)
}

/**
 * Importiert eine MP4-Datei vom Gerät in den lokalen Katalog.
 * Nativ → Directory.Data; Browser → IndexedDB.
 */
export async function importLocalMp4(file: File, title: string): Promise<LocalImportResult> {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return { ok: false, error: "title_required" }
  if (!file) return { ok: false, error: "file_required" }
  if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
    return { ok: false, error: "file_type" }
  }
  if (file.size > MAX_LOCAL_MP4_BYTES) {
    return { ok: false, error: "file_too_large" }
  }
  if (file.size === 0) {
    return { ok: false, error: "empty_file" }
  }

  const id = newId()
  const relativePath = relativePathFor(id)

  try {
    if (isCapacitorNativeShell()) {
      await ensureVideosDir()
      const buffer = await file.arrayBuffer()
      const { Filesystem, Directory } = await loadNativeVideoFilesystem()
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

      const map = await readCatalogMap()
      const entry: LocalVideoCatalogEntry = {
        id,
        title: trimmedTitle,
        type: "mp4",
        url: "",
        localOfflinePath: uri || relativePath,
        createdAt: new Date().toISOString(),
        source: "local",
        sortOrder: nextSortOrder(map),
        downloadStatus: "done",
        downloadProgress: 100,
        downloadFormat: "mp4",
        fileSizeBytes: file.size,
        // Kopie in App-Data; Original auf dem Gerät bleibt unberührt / read-only
        storageOrigin: "device-pick",
      }
      map[id] = entry
      await writeCatalogMap(map)
      return { ok: true, entry, video: catalogEntryToVideoItem(entry) }
    }

    // Browser: IndexedDB (App-Kopie des gewählten Files – kein Original-Pfad)
    try {
      await idbPutBlob(id, file)
    } catch {
      return { ok: false, error: "browser_storage_failed" }
    }

    const map = await readCatalogMap()
    const entry: LocalVideoCatalogEntry = {
      id,
      title: trimmedTitle,
      type: "mp4",
      url: "",
      localOfflinePath: `idb:${id}`,
      createdAt: new Date().toISOString(),
      source: "local",
      browserBlob: true,
      sortOrder: nextSortOrder(map),
      downloadStatus: "done",
      downloadProgress: 100,
      downloadFormat: "mp4",
      fileSizeBytes: file.size,
      storageOrigin: "device-pick",
    }
    map[id] = entry
    await writeCatalogMap(map)
    return { ok: true, entry, video: catalogEntryToVideoItem(entry) }
  } catch (e) {
    console.error("[videos/local-catalog] importLocalMp4 failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Entfernt Katalog-Eintrag.
 * Löscht nur App-verwaltete Kopien (IDB / Directory.Data/videos/{id}.mp4).
 * content:// und externe Geräte-Originale werden nie per unlink entfernt.
 */
export async function removeLocalCatalogEntry(videoId: string): Promise<boolean> {
  if (!videoId?.trim()) return false
  const id = videoId.trim()
  const map = await readCatalogMap()
  const entry = map[id]
  if (!entry) return false

  const offline = entry.localOfflinePath?.trim() || ""

  // IDB-Blob = immer App-Kopie (Download oder Import-Kopie), nie Geräte-Originalpfad
  if (entry.browserBlob || offline.startsWith("idb:")) {
    await idbDeleteBlob(id)
  } else if (isCapacitorNativeShell() && offline && !offline.startsWith("content:")) {
    // Nur die bekannte App-Data-Relative löschen – nie absolute/externe Pfade
    const appRel = relativePathFor(id)
    const mayDeleteAppCopy =
      isAppManagedMediaPath(offline, id) ||
      offline.startsWith("file") ||
      resolveStorageOrigin(entry) === "device-pick" ||
      resolveStorageOrigin(entry) === "app-download"
    if (mayDeleteAppCopy) {
      await deleteLocalVideo(id)
      try {
        const { Filesystem, Directory } = await import("@capacitor/filesystem")
        try {
          await Filesystem.deleteFile({ path: appRel, directory: Directory.Data })
        } catch {
          /* already gone */
        }
      } catch {
        /* ignore */
      }
    }
  }

  delete map[id]
  await writeCatalogMap(map)
  return true
}

export async function updateLocalCatalogEntry(
  id: string,
  patch: Partial<Omit<LocalVideoCatalogEntry, "id">>
): Promise<LocalVideoCatalogEntry | null> {
  return patchCatalogEntry(id, patch)
}

export async function reorderLocalCatalog(orderedIds: string[]): Promise<void> {
  const map = await readCatalogMap()
  orderedIds.forEach((rawId, index) => {
    const id = rawId.trim()
    if (map[id]) {
      map[id] = { ...map[id], sortOrder: index }
    }
  })
  await writeCatalogMap(map)
}

/**
 * Erhöht die App-Aufrufe um 1 (bei Session-Start).
 * `viewCountToday` zählt nur am aktuellen Kalendertag; wechselt das Datum, startet der Zähler bei 1.
 */
export async function bumpViewCount(id: string): Promise<LocalVideoCatalogEntry | null> {
  const map = await readCatalogMap()
  const entry = map[id.trim()]
  if (!entry) return null
  const today = todayIsoDate()
  const viewCount = (entry.viewCount ?? 0) + 1
  const viewCountToday =
    entry.viewCountTodayDate === today ? (entry.viewCountToday ?? 0) + 1 : 1
  return patchCatalogEntry(id, {
    viewCount,
    viewCountToday,
    viewCountTodayDate: today,
  })
}

export async function updatePlaybackProgress(
  id: string,
  lastPositionSeconds: number,
  totalWatchedSeconds?: number
): Promise<LocalVideoCatalogEntry | null> {
  const patch: Partial<LocalVideoCatalogEntry> = {
    lastPositionSeconds: Math.max(0, lastPositionSeconds),
  }
  if (typeof totalWatchedSeconds === "number") {
    patch.totalWatchedSeconds = Math.max(0, totalWatchedSeconds)
  }
  return patchCatalogEntry(id, patch)
}

export async function setWatchLimit(
  id: string,
  watchLimitMinutes: number | undefined
): Promise<LocalVideoCatalogEntry | null> {
  if (watchLimitMinutes !== undefined && watchLimitMinutes < 0) {
    return null
  }
  return patchCatalogEntry(id, { watchLimitMinutes })
}

export async function markDownloadProgress(
  id: string,
  progress: number
): Promise<LocalVideoCatalogEntry | null> {
  const clamped = Math.min(100, Math.max(0, progress))
  return patchCatalogEntry(id, {
    downloadStatus: "downloading",
    downloadProgress: clamped,
    downloadError: undefined,
  })
}

export async function markDownloadDone(
  id: string,
  localPath: string,
  fileSizeBytes?: number,
  meta?: { durationSeconds?: number },
): Promise<LocalVideoCatalogEntry | null> {
  const map = await readCatalogMap()
  const prev = map[id.trim()]
  const sourceUrl = prev?.sourceUrl || (prev?.type === "youtube" ? prev.url : undefined)
  const patch: Partial<Omit<LocalVideoCatalogEntry, "id">> = {
    downloadStatus: "done",
    downloadProgress: 100,
    localOfflinePath: localPath,
    downloadError: undefined,
    type: "mp4",
    // Kein YouTube-Embed mehr – Original-URL nur als Metadaten
    url: "",
    sourceUrl,
    thumbnailUrl: prev?.thumbnailUrl,
    storageOrigin: "app-download",
  }
  if (typeof fileSizeBytes === "number" && Number.isFinite(fileSizeBytes) && fileSizeBytes >= 0) {
    patch.fileSizeBytes = fileSizeBytes
  }
  const dur = meta?.durationSeconds
  const missingDuration =
    typeof prev?.durationSeconds !== "number" ||
    !Number.isFinite(prev.durationSeconds) ||
    prev.durationSeconds <= 0
  if (missingDuration && typeof dur === "number" && Number.isFinite(dur) && dur > 0) {
    patch.durationSeconds = Math.round(dur)
  } else if (typeof prev?.durationSeconds === "number") {
    patch.durationSeconds = prev.durationSeconds
  }
  return patchCatalogEntry(id, patch)
}

/** Browser: MP4-Blob in IndexedDB legen und Katalog als heruntergeladen markieren. */
export async function markDownloadDoneWithBrowserBlob(
  id: string,
  blob: Blob,
  meta?: { durationSeconds?: number },
): Promise<LocalVideoCatalogEntry | null> {
  const trimmed = id.trim()
  if (!trimmed || !blob?.size) return null
  try {
    await idbPutBlob(trimmed, blob)
  } catch (e) {
    console.error("[videos/local-catalog] idbPutBlob failed:", e)
    return null
  }
  const map = await readCatalogMap()
  const prev = map[trimmed]
  const sourceUrl = prev?.sourceUrl || (prev?.type === "youtube" ? prev.url : undefined)
  const patch: Partial<Omit<LocalVideoCatalogEntry, "id">> = {
    downloadStatus: "done",
    downloadProgress: 100,
    localOfflinePath: `idb:${trimmed}`,
    browserBlob: true,
    downloadError: undefined,
    type: "mp4",
    url: "",
    sourceUrl,
    thumbnailUrl: prev?.thumbnailUrl,
    fileSizeBytes: blob.size,
    storageOrigin: "app-download",
  }
  const dur = meta?.durationSeconds
  const missingDuration =
    typeof prev?.durationSeconds !== "number" ||
    !Number.isFinite(prev.durationSeconds) ||
    prev.durationSeconds <= 0
  if (missingDuration && typeof dur === "number" && Number.isFinite(dur) && dur > 0) {
    patch.durationSeconds = Math.round(dur)
  } else if (typeof prev?.durationSeconds === "number") {
    patch.durationSeconds = prev.durationSeconds
  }
  return patchCatalogEntry(trimmed, patch)
}

/**
 * Entfernt nur App-eigene Offline-Dateien/Blobs (YouTube-Download-Cache).
 * device-pick: No-Op – Original-/Import-Medien werden nie gelöscht.
 * Metadaten (Titel, Thumbnail, sourceUrl, createdAt) bleiben.
 */
export async function clearLocalVideoFile(videoId: string): Promise<LocalVideoCatalogEntry | null> {
  const id = videoId.trim()
  if (!id) return null
  const map = await readCatalogMap()
  const entry = map[id]
  if (!entry) return null

  const origin = resolveStorageOrigin(entry)
  // Geräte-Auswahl: Original read-only – weder unlink noch Katalog-Detach der Datei
  if (origin === "device-pick") {
    return entry
  }

  // Nur App-Downloads dürfen Cache/Blob löschen
  if (origin !== "app-download") {
    return entry
  }

  const offline = entry.localOfflinePath?.trim() || ""
  if (entry.browserBlob || offline.startsWith("idb:")) {
    await idbDeleteBlob(id)
  } else if (entryHasLocalFile(entry) && isCapacitorNativeShell() && !offline.startsWith("content:")) {
    await deleteLocalVideo(id)
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem")
      try {
        await Filesystem.deleteFile({ path: relativePathFor(id), directory: Directory.Data })
      } catch {
        /* already gone */
      }
    } catch {
      /* ignore */
    }
  }

  const sourceUrl = entry.sourceUrl?.trim()
  const displayUrl = sourceUrl || entry.url?.trim() || ""
  const restoreYoutube = Boolean(sourceUrl && isYoutubeUrl(sourceUrl))

  return patchCatalogEntry(id, {
    localOfflinePath: "",
    browserBlob: undefined,
    fileSizeBytes: undefined,
    downloadProgress: undefined,
    downloadError: undefined,
    downloadStatus: sourceUrl ? "queued" : "idle",
    url: displayUrl,
    type: restoreYoutube ? "youtube" : entry.type === "mp4" ? "mp4" : entry.type,
    storageOrigin: "link-only",
  })
}

export async function markDownloadError(
  id: string,
  downloadError: string
): Promise<LocalVideoCatalogEntry | null> {
  return patchCatalogEntry(id, {
    downloadStatus: "error",
    downloadError: downloadError.trim() || "download_failed",
  })
}

/** Hilfs-Check ob URL YouTube ist (für Admin-Fallback). */
export { isYoutubeUrl }
