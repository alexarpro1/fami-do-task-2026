export type VideoType = "youtube" | "mp4"

export type VideoSource = "cloud" | "local"

export type VideoDownloadStatus =
  | "idle"
  | "queued"
  | "downloading"
  | "done"
  | "error"
  | "native_only"

export type VideoDownloadQuality = "best" | "720p" | "480p" | "360p"

export type VideoDownloadFormat = "mp4"

/**
 * Woher die lokale Mediendatei kommt:
 * - app-download: von der App heruntergeladen (YouTube/yt-dlp / Browser-Server → App-Cache/IDB)
 * - device-pick: Nutzer hat Datei vom Gerät gewählt (Original auf dem Gerät ist read-only)
 * - link-only: nur YouTube-/Datei-Link, keine lokale App-Datei
 */
export type VideoStorageOrigin = "app-download" | "device-pick" | "link-only"

/** Serie (Ordner) mit Staffeln und Episoden. */
export interface VideoSeries {
  id: string
  title: string
  sortOrder: number
  createdAt: string
  thumbnailUrl?: string
}

/** Staffel innerhalb einer Serie. */
export interface VideoSeason {
  id: string
  seriesId: string
  title: string
  seasonNumber: number
  sortOrder: number
}

export interface VideoItem {
  id: string
  title: string
  url: string
  type: VideoType
  thumbnailUrl?: string
  durationSeconds?: number
  localOfflinePath?: string
  downloadProgress?: number
  isDownloaded?: boolean
  /** cloud = Supabase; local = Geräte-Katalog (kein Sync) */
  source?: VideoSource
  downloadStatus?: VideoDownloadStatus
  downloadQuality?: VideoDownloadQuality
  downloadFormat?: VideoDownloadFormat
  sourceUrl?: string
  /** Herkunft der lokalen Datei – steuert u. a. „Speicher leeren“ */
  storageOrigin?: VideoStorageOrigin
  sortOrder?: number
  /** Zugehörigkeit zu Serie/Staffel (lokal) */
  seriesId?: string
  seasonId?: string
  /** Reihenfolge innerhalb der Staffel (1-basiert) */
  episodeNumber?: number
  /** App-interne Aufrufe (nicht YouTube-Analytics) */
  viewCount?: number
  /** Aufrufe am Kalendertag `viewCountTodayDate` (lokal) */
  viewCountToday?: number
  /** ISO-Datum YYYY-MM-DD für `viewCountToday` */
  viewCountTodayDate?: string
  lastPositionSeconds?: number
  watchLimitMinutes?: number
  totalWatchedSeconds?: number
  downloadError?: string
  fileSizeBytes?: number
  createdAt?: string
}
