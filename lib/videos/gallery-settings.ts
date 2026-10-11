import { Capacitor } from "@capacitor/core"

export const STORAGE_KEY = "famiapp-video-gallery-settings"

export type GalleryLayout = "poster" | "list" | "compact"

export type GalleryDefaultSort = "sortOrder" | "recent" | "title" | "newest"

/** Horizontal column density for poster/grid layout. */
export type GalleryColumns = 2 | 3 | 4 | 5 | 6

/** Canonical gallery preferences (plan name). */
export type VideosGallerySettings = {
  galleryLayout: GalleryLayout
  defaultSort: GalleryDefaultSort
  /** Only applied when galleryLayout is `poster`. */
  galleryColumns: GalleryColumns
  /** Admin → Serien-Tab: Karten-Raster */
  adminSeriesColumns: GalleryColumns
  /** Admin → Bibliothek: Video-Karten-Raster */
  adminLibraryColumns: GalleryColumns
}

/** @deprecated Prefer VideosGallerySettings */
export type GallerySettings = VideosGallerySettings

const DEFAULT_SETTINGS: VideosGallerySettings = {
  galleryLayout: "poster",
  defaultSort: "sortOrder",
  galleryColumns: 2,
  adminSeriesColumns: 3,
  adminLibraryColumns: 3,
}

function isGalleryLayout(v: unknown): v is GalleryLayout {
  return v === "poster" || v === "list" || v === "compact"
}

function isGalleryDefaultSort(v: unknown): v is GalleryDefaultSort {
  return (
    v === "sortOrder" || v === "recent" || v === "title" || v === "newest"
  )
}

function isGalleryColumns(v: unknown): v is GalleryColumns {
  return v === 2 || v === 3 || v === 4 || v === 5 || v === 6
}

function normalizeSettings(raw: unknown): VideosGallerySettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS }
  const o = raw as Record<string, unknown>
  // Prefer plan key; accept legacy `layout` from earlier agent merge
  const layoutRaw = o.galleryLayout ?? o.layout
  const galleryLayout = isGalleryLayout(layoutRaw)
    ? layoutRaw
    : DEFAULT_SETTINGS.galleryLayout
  const defaultSort = isGalleryDefaultSort(o.defaultSort)
    ? o.defaultSort
    : DEFAULT_SETTINGS.defaultSort
  const columnsRaw = o.galleryColumns ?? o.columns
  const columnsNum =
    typeof columnsRaw === "string" ? Number(columnsRaw) : columnsRaw
  const galleryColumns = isGalleryColumns(columnsNum)
    ? columnsNum
    : DEFAULT_SETTINGS.galleryColumns
  const adminSeriesRaw = o.adminSeriesColumns
  const adminSeriesNum =
    typeof adminSeriesRaw === "string" ? Number(adminSeriesRaw) : adminSeriesRaw
  const adminSeriesColumns = isGalleryColumns(adminSeriesNum)
    ? adminSeriesNum
    : DEFAULT_SETTINGS.adminSeriesColumns
  const adminLibraryRaw = o.adminLibraryColumns
  const adminLibraryNum =
    typeof adminLibraryRaw === "string" ? Number(adminLibraryRaw) : adminLibraryRaw
  const adminLibraryColumns = isGalleryColumns(adminLibraryNum)
    ? adminLibraryNum
    : DEFAULT_SETTINGS.adminLibraryColumns
  return {
    galleryLayout,
    defaultSort,
    galleryColumns,
    adminSeriesColumns,
    adminLibraryColumns,
  }
}

export async function getGallerySettings(): Promise<VideosGallerySettings> {
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

export async function setGallerySettings(
  settings: VideosGallerySettings,
): Promise<void> {
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
      console.error("[videos/gallery-settings] Preferences.set failed:", e)
    }
  }
}
