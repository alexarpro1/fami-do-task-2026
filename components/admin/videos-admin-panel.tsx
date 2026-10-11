"use client"

/**
 * Admin: Videos verwalten –
 * - Video-Link (YouTube / direkte .mp4/.webm/.m3u8): nur lokal
 * - MP4 hochladen: Cloud-Storage (wenn erreichbar)
 * - Vom Gerät: lokaler Datei-Import (+ optional lokaler Link)
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  Library,
  Link2,
  Loader2,
  RotateCw,
  Settings2,
  Trash2,
  Upload,
  Youtube,
} from "lucide-react"
import { VideosAdminSeriesSection } from "@/components/admin/videos/videos-admin-series-section"
import {
  videosAdminButtonSecondaryClass,
  videosAdminCardClass,
  videosAdminFieldClass,
  videosAdminHintClass,
  videosAdminLabelClass,
  videosAdminPanelClass,
  videosAdminSelectClass,
  videosAdminSelectStyle,
  videosAdminSwitchClass,
  videosAdminSwitchRowClass,
} from "@/components/admin/videos/videos-admin-field-styles"
import {
  getSeriesCatalog,
  type SeriesCatalogState,
} from "@/lib/videos/series-catalog"
import { useTranslation } from "@/hooks/use-translation"
import { useSyncId, ensureSyncIdInAuth } from "@/hooks/useSyncId"
import {
  createClient,
  isSupabaseConfigured,
  isSupabaseCloudActive,
  isSupabaseNotConfiguredError,
  isSupabaseUnreachableError,
  isVideosBucketMissingError,
  isVideosTableMissingError,
  probeSupabaseConfigured,
} from "@/lib/supabase/client"
import {
  addLocalVideoLink,
  importLocalMp4,
  listLocalCatalog,
  removeLocalCatalogEntry,
  reorderLocalCatalog,
  setWatchLimit,
  updateLocalCatalogEntry,
  clearLocalVideoFile,
  canClearLocalVideoStorage,
  effectiveViewCountToday,
  formatVideoFileSize,
  resolveStorageOrigin,
} from "@/lib/videos/local-catalog"
import {
  getAdvancedSettings,
  setAdvancedSettings,
  type VideoAdvancedSettings,
} from "@/lib/videos/advanced-settings"
import { getDownloadSettings, setDownloadSettings } from "@/lib/videos/download-settings"
import {
  getGallerySettings,
  setGallerySettings,
  type GalleryColumns,
  type GalleryDefaultSort,
  type GalleryLayout,
  type VideosGallerySettings,
} from "@/lib/videos/gallery-settings"
import { galleryColumnsGridClass } from "@/lib/videos/gallery-grid-classes"
import { VideosAdminColumnsToggle } from "@/components/admin/videos/videos-admin-columns-toggle"
import type { Language } from "@/lib/i18n"
import { runLocalYoutubeDownload } from "@/lib/videos/start-local-youtube-download"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { VideoDownloadQuality, VideoItem, VideoType } from "@/types/video"

const BUCKET = "famiapp-videos"
const MAX_MP4_BYTES = 80 * 1024 * 1024

type FormMode = "youtube" | "mp4" | "local"

type AdminSection =
  | "overview"
  | "design"
  | "library"
  | "series"
  | "stats"
  | "advanced"

const ADMIN_SECTIONS: AdminSection[] = [
  "overview",
  "design",
  "library",
  "series",
  "stats",
  "advanced",
]

const QUALITY_OPTIONS: VideoDownloadQuality[] = ["best", "720p", "480p", "360p"]

const LOCALE_BY_LANG: Record<Language, string> = {
  de: "de-DE",
  gb: "en-GB",
  es: "es-ES",
  tr: "tr-TR",
  ru: "ru-RU",
  ro: "ro-RO",
}

const GALLERY_LAYOUTS: GalleryLayout[] = ["poster", "list", "compact"]
const GALLERY_COLUMNS: GalleryColumns[] = [2, 3, 4, 5, 6]
const GALLERY_SORTS: GalleryDefaultSort[] = ["sortOrder", "recent", "title", "newest"]

function formatMmSs(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "0:00"
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/** Watch-Dauer: m:ss bzw. h:mm:ss */
function formatWatchDuration(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "0:00"
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

function isYoutubeOriginItem(item: VideoItem): boolean {
  return item.type === "youtube" || Boolean(item.sourceUrl?.trim())
}

function youtubeSourceUrlForItem(item: VideoItem): string | null {
  const fromSource = item.sourceUrl?.trim()
  if (fromSource) return fromSource
  if (item.type === "youtube") {
    const fromUrl = item.url?.trim()
    if (fromUrl) return fromUrl
  }
  return null
}

/** YouTube-Eintrag: erneut laden (idle/queued/error/Nur-Link) oder Datei ersetzen (done). */
function canOfferYoutubeRedownload(item: VideoItem): boolean {
  if (item.source !== "local") return false
  if (!youtubeSourceUrlForItem(item)) return false
  if (!isYoutubeOriginItem(item)) return false
  if (item.downloadStatus === "downloading") return false
  return true
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  try {
    return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] ?? "") || null
  } catch {
    return null
  }
}

function mapRow(row: Record<string, unknown>): VideoItem {
  const createdRaw = row.created_at
  const createdAt =
    typeof createdRaw === "string"
      ? createdRaw
      : createdRaw != null
        ? String(createdRaw)
        : undefined
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    url: String(row.url ?? ""),
    type: (row.type === "mp4" ? "mp4" : "youtube") as VideoType,
    thumbnailUrl: row.thumbnail_url != null ? String(row.thumbnail_url) : undefined,
    durationSeconds:
      typeof row.duration_seconds === "number"
        ? row.duration_seconds
        : row.duration_seconds != null
          ? Number(row.duration_seconds) || undefined
          : undefined,
    source: "cloud",
    createdAt,
  }
}

function formatAddedAt(iso: string | undefined, lang: Language): string | null {
  if (!iso?.trim()) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang] ?? "de-DE", {
      dateStyle: "medium",
    }).format(d)
  } catch {
    return null
  }
}

function localItemHasStoredFile(item: VideoItem): boolean {
  if (item.source !== "local") return false
  // Echter lokaler Pfad/Blob – nicht nur Status „done“ ohne Datei („Nur Link“)
  return Boolean(item.localOfflinePath?.trim())
}

function itemCanClearStorage(item: VideoItem): boolean {
  if (item.source !== "local" || !localItemHasStoredFile(item)) return false
  return canClearLocalVideoStorage({
    storageOrigin: item.storageOrigin,
    sourceUrl: item.sourceUrl,
    type: item.type,
    localOfflinePath: item.localOfflinePath ?? "",
    browserBlob: item.localOfflinePath?.startsWith("idb:") ? true : undefined,
    downloadStatus: item.downloadStatus,
  })
}

function itemIsDevicePick(item: VideoItem): boolean {
  if (item.source !== "local") return false
  return (
    resolveStorageOrigin({
      storageOrigin: item.storageOrigin,
      sourceUrl: item.sourceUrl,
      type: item.type,
      localOfflinePath: item.localOfflinePath ?? "",
      browserBlob: item.localOfflinePath?.startsWith("idb:") ? true : undefined,
      downloadStatus: item.downloadStatus,
    }) === "device-pick"
  )
}

export function VideosAdminPanel() {
  const { t, lang, translate } = useTranslation()
  const tv = t.compAdminVideos
  const { syncId, isLoading: syncIdLoading } = useSyncId()

  const [configChecked, setConfigChecked] = useState(false)
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cloudWarning, setCloudWarning] = useState<string | null>(null)

  const [mode, setMode] = useState<FormMode>("local")
  const [title, setTitle] = useState("")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [defaultQuality, setDefaultQuality] = useState<VideoDownloadQuality>("720p")
  const [addQualityOverride, setAddQualityOverride] = useState<VideoDownloadQuality | "default">(
    "default",
  )
  const [retryQualityById, setRetryQualityById] = useState<Record<string, VideoDownloadQuality>>({})
  const [retryBusyId, setRetryBusyId] = useState<string | null>(null)
  const [galleryLayout, setGalleryLayout] = useState<GalleryLayout>("poster")
  const [galleryDefaultSort, setGalleryDefaultSort] = useState<GalleryDefaultSort>("sortOrder")
  const [galleryColumns, setGalleryColumns] = useState<GalleryColumns>(2)
  const [adminSeriesColumns, setAdminSeriesColumns] = useState<GalleryColumns>(3)
  const [adminLibraryColumns, setAdminLibraryColumns] = useState<GalleryColumns>(3)
  const [clearStorageBusyId, setClearStorageBusyId] = useState<string | null>(null)
  const [storageBusy, setStorageBusy] = useState(false)
  const [adminSection, setAdminSection] = useState<AdminSection>("overview")
  const [seriesCatalog, setSeriesCatalog] = useState<SeriesCatalogState>({
    series: [],
    seasons: [],
  })
  const [advancedSettings, setAdvancedSettingsState] = useState<VideoAdvancedSettings>({
    defaultWatchLimitMinutes: null,
    wifiOnlyDownloads: false,
    autoplayNextEpisode: false,
    showCaptionsWhenAvailable: false,
  })

  const cloudOk = supabaseReady || isSupabaseConfigured()

  const qualityLabel = useCallback(
    (q: VideoDownloadQuality) => {
      switch (q) {
        case "best":
          return tv.qualityBest
        case "720p":
          return tv.quality720
        case "480p":
          return tv.quality480
        case "360p":
          return tv.quality360
        default:
          return q
      }
    },
    [tv.qualityBest, tv.quality720, tv.quality480, tv.quality360],
  )

  const resolveAddQuality = useCallback((): VideoDownloadQuality => {
    return addQualityOverride === "default" ? defaultQuality : addQualityOverride
  }, [addQualityOverride, defaultQuality])

  const mapVideosError = useCallback(
    (err: unknown, fallback: string): string => {
      if (isVideosTableMissingError(err)) return tv.tableMissing
      if (isVideosBucketMissingError(err)) return tv.bucketMissing
      if (isSupabaseNotConfiguredError(err) && !isSupabaseConfigured()) return tv.notConfigured
      if (isSupabaseUnreachableError(err) || isSupabaseNotConfiguredError(err)) return tv.cloudUnreachable
      if (err && typeof err === "object" && "message" in err) {
        const msg = String((err as { message?: unknown }).message ?? "").trim()
        if (msg) return msg
      }
      if (typeof err === "string" && err.trim()) return err
      return fallback
    },
    [tv.tableMissing, tv.bucketMissing, tv.notConfigured, tv.cloudUnreachable],
  )

  const mapLocalError = useCallback(
    (code: string): string => {
      switch (code) {
        case "title_required":
          return tv.validationTitleRequired
        case "url_required":
          return tv.validationUrlRequired
        case "url_invalid":
          return tv.validationUrlInvalid
        case "file_required":
          return tv.validationFileRequired
        case "file_type":
          return tv.validationFileType
        case "file_too_large":
          return tv.validationFileTooLarge
        case "browser_storage_failed":
          return tv.localImportBrowserFailed
        case "empty_file":
          return tv.validationFileRequired
        default:
          return tv.errorSave
      }
    },
    [tv],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const ready = (await probeSupabaseConfigured()) || isSupabaseConfigured()
      if (!cancelled) {
        setSupabaseReady(ready)
        setConfigChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void getDownloadSettings().then((s) => setDefaultQuality(s.quality))
  }, [])

  useEffect(() => {
    void getAdvancedSettings().then(setAdvancedSettingsState)
  }, [])

  useEffect(() => {
    void getGallerySettings().then((s) => {
      setGalleryLayout(s.galleryLayout)
      setGalleryDefaultSort(s.defaultSort)
      setGalleryColumns(s.galleryColumns)
      setAdminSeriesColumns(s.adminSeriesColumns)
      setAdminLibraryColumns(s.adminLibraryColumns)
    })
  }, [])

  useEffect(() => {
    void getSeriesCatalog().then(setSeriesCatalog)
  }, [])

  const persistAdvanced = async (next: VideoAdvancedSettings) => {
    setAdvancedSettingsState(next)
    await setAdvancedSettings(next)
  }

  const sectionLabel = useCallback(
    (section: AdminSection) => {
      switch (section) {
        case "overview":
          return tv.tabOverview
        case "design":
          return tv.tabDesign
        case "library":
          return tv.tabLibrary
        case "series":
          return tv.tabSeries
        case "stats":
          return tv.tabStats
        case "advanced":
          return tv.tabAdvanced
        default:
          return section
      }
    },
    [tv],
  )

  const currentGallerySettings = useCallback(
    (): VideosGallerySettings => ({
      galleryLayout,
      defaultSort: galleryDefaultSort,
      galleryColumns,
      adminSeriesColumns,
      adminLibraryColumns,
    }),
    [
      galleryLayout,
      galleryDefaultSort,
      galleryColumns,
      adminSeriesColumns,
      adminLibraryColumns,
    ],
  )

  const persistGallerySettings = async (patch: Partial<VideosGallerySettings>) => {
    const next = { ...currentGallerySettings(), ...patch }
    if (patch.galleryLayout != null) setGalleryLayout(patch.galleryLayout)
    if (patch.defaultSort != null) setGalleryDefaultSort(patch.defaultSort)
    if (patch.galleryColumns != null) setGalleryColumns(patch.galleryColumns)
    if (patch.adminSeriesColumns != null) setAdminSeriesColumns(patch.adminSeriesColumns)
    if (patch.adminLibraryColumns != null) setAdminLibraryColumns(patch.adminLibraryColumns)
    await setGallerySettings(next)
  }

  const handleGalleryLayoutChange = async (layout: GalleryLayout) => {
    await persistGallerySettings({ galleryLayout: layout })
  }

  const handleGallerySortChange = async (defaultSort: GalleryDefaultSort) => {
    await persistGallerySettings({ defaultSort })
  }

  const handleGalleryColumnsChange = async (columns: GalleryColumns) => {
    await persistGallerySettings({ galleryColumns: columns })
  }

  const handleAdminSeriesColumnsChange = async (columns: GalleryColumns) => {
    await persistGallerySettings({ adminSeriesColumns: columns })
  }

  const handleAdminLibraryColumnsChange = async (columns: GalleryColumns) => {
    await persistGallerySettings({ adminLibraryColumns: columns })
  }

  const columnsToggleAria =
    translate("pageVideos.columnsToggleAria") !== "pageVideos.columnsToggleAria"
      ? translate("pageVideos.columnsToggleAria")
      : tv.columnsLabel

  const adminColumnToggleLabels = {
    groupAria: columnsToggleAria,
    col2: tv.columns2,
    col3: tv.columns3,
    col4: tv.columns4,
    col5: tv.columns5,
    col6: tv.columns6,
  }

  const galleryLayoutLabel = useCallback(
    (layout: GalleryLayout) => {
      switch (layout) {
        case "poster":
          return tv.layoutPoster
        case "list":
          return tv.layoutList
        case "compact":
          return tv.layoutCompact
        default:
          return layout
      }
    },
    [tv.layoutPoster, tv.layoutList, tv.layoutCompact],
  )

  const gallerySortLabel = useCallback(
    (sort: GalleryDefaultSort) => {
      switch (sort) {
        case "sortOrder":
          return tv.sortDefault
        case "recent":
          return tv.sortRecent
        case "title":
          return tv.sortTitle
        case "newest":
          return tv.sortNewest
        default:
          return sort
      }
    },
    [tv.sortDefault, tv.sortRecent, tv.sortTitle, tv.sortNewest],
  )

  const loadVideos = useCallback(async () => {
    setError(null)
    setCloudWarning(null)
    setLoading(true)
    try {
      const local = await listLocalCatalog()
      let cloud: VideoItem[] = []

      if (cloudOk && syncId) {
        try {
          await ensureSyncIdInAuth(syncId)
          if (!isSupabaseCloudActive() && isSupabaseConfigured()) {
            setCloudWarning(tv.cloudUnreachable)
          } else {
            const supabase = createClient()
            const { data, error: qErr } = await supabase
              .from("videos")
              .select("id, title, type, url, thumbnail_url, duration_seconds, created_at")
              .eq("sync_id", syncId)
              .order("created_at", { ascending: false })

            if (qErr) {
              setCloudWarning(mapVideosError(qErr, tv.errorLoad))
            } else {
              cloud = ((data ?? []) as Record<string, unknown>[]).map(mapRow)
            }
          }
        } catch (e) {
          setCloudWarning(mapVideosError(e, tv.errorLoad))
        }
      } else if (!cloudOk) {
        setCloudWarning(tv.localOnlyHint)
      }

      const localIds = new Set(local.map((v) => v.id))
      setVideos([...local, ...cloud.filter((v) => !localIds.has(v.id))])
    } finally {
      setLoading(false)
    }
  }, [cloudOk, syncId, mapVideosError, tv.cloudUnreachable, tv.errorLoad, tv.localOnlyHint])

  useEffect(() => {
    if (syncIdLoading || !configChecked) return
    void loadVideos()
  }, [syncIdLoading, configChecked, loadVideos])

  useEffect(() => {
    const needsPoll = videos.some(
      (v) =>
        v.source === "local" &&
        (v.downloadStatus === "downloading" || v.downloadStatus === "queued"),
    )
    if (!needsPoll) return
    const timer = window.setInterval(() => {
      void loadVideos()
    }, 2000)
    return () => window.clearInterval(timer)
  }, [videos, loadVideos])

  const handleDefaultQualityChange = async (quality: VideoDownloadQuality) => {
    setDefaultQuality(quality)
    await setDownloadSettings({ quality, format: "mp4" })
  }

  const startYoutubeDownload = useCallback(
    async (videoId: string, sourceUrl: string, quality: VideoDownloadQuality) => {
      const dl = await runLocalYoutubeDownload(videoId, sourceUrl, quality)
      if (dl.error === "browser_server_offline") {
        setError(tv.downloadBrowserServerOffline)
      } else if (dl.error === "wifi_only") {
        setError(tv.wifiOnlyError)
      } else if (dl.error === "native_only") {
        setInfo(tv.downloadNativeOnly)
      } else if (dl.ok) {
        setInfo(tv.downloadDone)
      } else {
        setError(tv.downloadError.replace("{error}", dl.error ?? "unknown"))
      }
      await loadVideos()
    },
    [
      loadVideos,
      tv.downloadBrowserServerOffline,
      tv.downloadDone,
      tv.downloadError,
      tv.downloadNativeOnly,
      tv.wifiOnlyError,
    ],
  )

  const maybeQueueYoutubeDownload = useCallback(
    async (video: VideoItem, sourceUrl: string) => {
      const isYoutube =
        video.type === "youtube" || video.downloadStatus === "queued" || Boolean(video.sourceUrl)
      if (!isYoutube || video.downloadStatus !== "queued") return
      setInfo(tv.downloadQueued)
      await startYoutubeDownload(video.id, sourceUrl, resolveAddQuality())
    },
    [resolveAddQuality, startYoutubeDownload, tv.downloadQueued],
  )

  const resetForm = () => {
    setTitle("")
    setYoutubeUrl("")
    setFile(null)
    const input = fileInputRef.current
    if (!input) return
    // Disabled file inputs behalten auf manchen Android-WebViews den alten Wert.
    const wasDisabled = input.disabled
    if (wasDisabled) input.disabled = false
    input.value = ""
    if (wasDisabled) input.disabled = wasDisabled
  }

  const handleSubmitLocal = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError(tv.validationTitleRequired)
      return
    }

    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (file) {
        const result = await importLocalMp4(file, trimmedTitle)
        if (!result.ok) {
          setError(mapLocalError(result.error))
          return
        }
        resetForm()
        setInfo(tv.successLocalAdded)
        await loadVideos()
        return
      }
      const url = youtubeUrl.trim()
      if (url) {
        const result = await addLocalVideoLink(trimmedTitle, url)
        if (!result.ok) {
          setError(mapLocalError(result.error))
          return
        }
        resetForm()
        setInfo(tv.successLocalAdded)
        await loadVideos()
        if (result.ok && result.video) {
          await maybeQueueYoutubeDownload(result.video, url)
        }
        return
      }
      setError(tv.validationLocalSource)
    } catch (e) {
      setError(mapVideosError(e, tv.errorSave))
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitVideoLink = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError(tv.validationTitleRequired)
      return
    }
    const url = youtubeUrl.trim()
    if (!url) {
      setError(tv.validationUrlRequired)
      return
    }

    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const result = await addLocalVideoLink(trimmedTitle, url)
      if (!result.ok) {
        setError(mapLocalError(result.error))
        return
      }
      resetForm()
      setInfo(tv.successLocalAdded)
      await loadVideos()
      if (result.video) {
        await maybeQueueYoutubeDownload(result.video, url)
      }
    } catch (e) {
      setError(mapVideosError(e, tv.errorSave))
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitCloud = async () => {
    setError(null)
    setInfo(null)

    if (!cloudOk) {
      setError(tv.notConfigured)
      return
    }
    if (!syncId) {
      setError(tv.noSyncId)
      return
    }
    if (!isSupabaseCloudActive() && isSupabaseConfigured()) {
      setError(tv.cloudUnreachable)
      return
    }

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError(tv.validationTitleRequired)
      return
    }

    setBusy(true)
    try {
      await ensureSyncIdInAuth(syncId)
      const supabase = createClient()

      if (mode === "mp4") {
        if (!file) {
          setError(tv.validationFileRequired)
          return
        }
        if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
          setError(tv.validationFileType)
          return
        }
        if (file.size > MAX_MP4_BYTES) {
          setError(tv.validationFileTooLarge)
          return
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)
        const storagePath = `${syncId}/${crypto.randomUUID()}-${safeName || "video.mp4"}`

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
          contentType: "video/mp4",
          upsert: false,
        })
        if (upErr) {
          setError(mapVideosError(upErr, tv.errorUpload))
          return
        }

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
        const publicUrl = pub?.publicUrl
        if (!publicUrl) {
          setError(tv.errorUpload)
          return
        }

        const { error: insErr } = await supabase.from("videos").insert({
          sync_id: syncId,
          title: trimmedTitle,
          type: "mp4",
          url: publicUrl,
        })
        if (insErr) {
          try {
            await supabase.storage.from(BUCKET).remove([storagePath])
          } catch {
            /* ignore */
          }
          setError(mapVideosError(insErr, tv.errorSave))
          return
        }
      }

      resetForm()
      setInfo(tv.successAdded)
      await loadVideos()
    } catch (e) {
      setError(mapVideosError(e, tv.errorSave))
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async () => {
    if (mode === "local") {
      await handleSubmitLocal()
      return
    }
    if (mode === "youtube") {
      await handleSubmitVideoLink()
      return
    }
    await handleSubmitCloud()
  }

  const handleDelete = async (item: VideoItem) => {
    if (!window.confirm(tv.deleteConfirm.replace("{title}", item.title))) return

    setDeletingId(item.id)
    setError(null)
    setInfo(null)
    try {
      if (item.source === "local") {
        const ok = await removeLocalCatalogEntry(item.id)
        if (!ok) {
          setError(tv.errorDelete)
          return
        }
        setVideos((prev) => prev.filter((v) => v.id !== item.id))
        setInfo(tv.successDeleted)
        return
      }

      if (!syncId || !cloudOk) {
        setError(tv.cloudUnreachable)
        return
      }

      await ensureSyncIdInAuth(syncId)
      const supabase = createClient()

      const { error: delErr } = await supabase
        .from("videos")
        .delete()
        .eq("id", item.id)
        .eq("sync_id", syncId)
      if (delErr) {
        setError(mapVideosError(delErr, tv.errorDelete))
        return
      }

      let storageWarn = false
      if (item.type === "mp4") {
        const path = storagePathFromPublicUrl(item.url)
        if (path) {
          const { error: stErr } = await supabase.storage.from(BUCKET).remove([path])
          if (stErr) storageWarn = true
        }
      }

      setVideos((prev) => prev.filter((v) => v.id !== item.id))
      setInfo(storageWarn ? tv.storageDeleteWarn : tv.successDeleted)
    } catch (e) {
      setError(mapVideosError(e, tv.errorDelete))
    } finally {
      setDeletingId(null)
    }
  }

  const localVideosOrdered = videos.filter((v) => v.source === "local")

  /** Meistgesehen zuerst (App-Aufrufe), dann Watch-Zeit; nur Einträge mit Plays */
  const videoStatsRanked = [...localVideosOrdered]
    .filter((v) => (v.viewCount ?? 0) > 0 || (v.totalWatchedSeconds ?? 0) > 0)
    .sort((a, b) => {
      const viewsDiff = (b.viewCount ?? 0) - (a.viewCount ?? 0)
      if (viewsDiff !== 0) return viewsDiff
      return (b.totalWatchedSeconds ?? 0) - (a.totalWatchedSeconds ?? 0)
    })

  const handleReorderLocal = async (id: string, direction: "up" | "down") => {
    const locals = [...localVideosOrdered]
    const idx = locals.findIndex((v) => v.id === id)
    if (idx === -1) return
    const swapWith = direction === "up" ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= locals.length) return
    ;[locals[idx], locals[swapWith]] = [locals[swapWith], locals[idx]]
    await reorderLocalCatalog(locals.map((v) => v.id))
    await loadVideos()
  }

  const handleWatchLimitChange = async (id: string, raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      await setWatchLimit(id, undefined)
      await loadVideos()
      return
    }
    const minutes = Number.parseInt(trimmed, 10)
    if (!Number.isFinite(minutes) || minutes < 0) return
    await setWatchLimit(id, minutes === 0 ? undefined : minutes)
    await loadVideos()
  }

  const handleClearStorage = async (item: VideoItem) => {
    if (!itemCanClearStorage(item)) {
      setError(tv.clearStorageRefused)
      return
    }
    if (!window.confirm(tv.clearStorageConfirm.replace("{title}", item.title))) return
    setClearStorageBusyId(item.id)
    setError(null)
    try {
      const beforePath = (item.localOfflinePath ?? "").trim()
      const updated = await clearLocalVideoFile(item.id)
      if (!updated) {
        setError(tv.errorSave)
        return
      }
      // device-pick / geschützt: No-Op → Datei unverändert
      const afterPath = (updated.localOfflinePath ?? "").trim()
      if (beforePath && afterPath === beforePath) {
        setError(tv.clearStorageRefused)
        return
      }
      setInfo(null)
      await loadVideos()
    } catch (e) {
      setError(mapVideosError(e, tv.errorSave))
    } finally {
      setClearStorageBusyId(null)
    }
  }

  const offlineStorageStats = (() => {
    const withFile = videos.filter((v) => localItemHasStoredFile(v) && itemCanClearStorage(v))
    const bytes = withFile.reduce((sum, v) => sum + (v.fileSizeBytes ?? 0), 0)
    return {
      count: withFile.length,
      sizeLabel: formatVideoFileSize(bytes) ?? (bytes > 0 ? `${bytes} B` : "—"),
      ids: withFile.map((v) => v.id),
    }
  })()

  const handleClearAllOffline = async () => {
    if (offlineStorageStats.count === 0) return
    if (!window.confirm(tv.storageClearAllConfirm)) return
    setStorageBusy(true)
    setError(null)
    try {
      for (const id of offlineStorageStats.ids) {
        await clearLocalVideoFile(id)
      }
      setInfo(tv.storageCleared)
      await loadVideos()
    } catch (e) {
      setError(mapVideosError(e, tv.errorSave))
    } finally {
      setStorageBusy(false)
    }
  }

  const handleResetAllResume = async () => {
    if (!window.confirm(tv.storageResetResumeConfirm)) return
    setStorageBusy(true)
    setError(null)
    try {
      for (const item of videos) {
        if ((item.lastPositionSeconds ?? 0) > 0) {
          await updateLocalCatalogEntry(item.id, { lastPositionSeconds: 0 })
        }
      }
      setInfo(tv.storageResumeReset)
      await loadVideos()
    } catch (e) {
      setError(mapVideosError(e, tv.errorSave))
    } finally {
      setStorageBusy(false)
    }
  }

  const handleRetryDownload = async (item: VideoItem) => {
    const sourceUrl = youtubeSourceUrlForItem(item)
    if (!sourceUrl) return
    const hasStoredFile = localItemHasStoredFile(item)
    if (hasStoredFile) {
      const ok = window.confirm(tv.redownloadConfirm.replace("{title}", item.title))
      if (!ok) return
    }
    const quality = retryQualityById[item.id] ?? item.downloadQuality ?? defaultQuality
    setRetryBusyId(item.id)
    setError(null)
    setInfo(null)
    try {
      if (hasStoredFile) {
        // Alte lokale Datei entfernen; sourceUrl bleibt → sauberer Re-Download
        const cleared = await clearLocalVideoFile(item.id)
        if (!cleared) {
          setError(tv.errorSave)
          return
        }
      } else {
        await updateLocalCatalogEntry(item.id, {
          downloadStatus: "queued",
          downloadError: undefined,
          downloadQuality: quality,
        })
      }
      if (hasStoredFile) {
        await updateLocalCatalogEntry(item.id, { downloadQuality: quality })
      }
      setInfo(tv.downloadQueued)
      await loadVideos()
      await startYoutubeDownload(item.id, sourceUrl, quality)
    } catch (e) {
      setError(mapVideosError(e, tv.errorSave))
    } finally {
      setRetryBusyId(null)
    }
  }

  const renderDownloadStatus = (item: VideoItem) => {
    if (item.source !== "local") return null
    const st = item.downloadStatus
    if (!st || st === "idle") return null
    if (st === "done") {
      return (
        <span className="text-xs text-emerald-600 dark:text-emerald-400">{tv.downloadDone}</span>
      )
    }
    if (st === "native_only") {
      return <span className="text-xs text-muted-foreground">{tv.downloadNativeOnly}</span>
    }
    if (item.downloadError === "browser_server_offline") {
      return (
        <span className="text-xs text-destructive">{tv.downloadBrowserServerOffline}</span>
      )
    }
    if (item.downloadError === "wifi_only") {
      return <span className="text-xs text-destructive">{tv.wifiOnlyError}</span>
    }
    if (st === "queued") {
      return <span className="text-xs text-muted-foreground">{tv.downloadQueued}</span>
    }
    if (st === "downloading") {
      const pct = Math.round(item.downloadProgress ?? 0)
      return (
        <span className="text-xs text-primary">
          {tv.downloadProgress.replace("{percent}", String(pct))}
        </span>
      )
    }
    if (st === "error") {
      const err = item.downloadError?.trim() || "unknown"
      return (
        <span className="text-xs text-destructive">
          {tv.downloadError.replace("{error}", err)}
        </span>
      )
    }
    return null
  }

  if (syncIdLoading || !configChecked) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{tv.loading}</span>
      </div>
    )
  }

  const hasSeriesGrid =
    seriesCatalog.series.length > 0 ||
    videos.some((v) => v.source === "local" && (!v.seriesId || !v.seasonId))

  const showHeaderColumnsToggle =
    adminSection === "library"
      ? videos.length > 0 && !loading
      : adminSection === "series"
        ? hasSeriesGrid
        : false

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-border bg-card/80 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <Film className="h-5 w-5 text-primary" />
              {tv.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{tv.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {showHeaderColumnsToggle ? (
              <VideosAdminColumnsToggle
                value={
                  adminSection === "library" ? adminLibraryColumns : adminSeriesColumns
                }
                onChange={(cols) =>
                  void (adminSection === "library"
                    ? handleAdminLibraryColumnsChange(cols)
                    : handleAdminSeriesColumnsChange(cols))
                }
                labels={adminColumnToggleLabels}
              />
            ) : null}
            {syncId ? (
              <span className="inline-flex items-center rounded-full bg-secondary/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                {syncId}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label={tv.settingsSection}>
          {ADMIN_SECTIONS.map((section) => {
            const Icon =
              section === "overview"
                ? LayoutGrid
                : section === "design"
                  ? Clapperboard
                  : section === "library"
                    ? Library
                    : section === "series"
                      ? FolderOpen
                      : section === "stats"
                        ? BarChart3
                        : Settings2
            return (
              <button
                key={section}
                type="button"
                role="tab"
                aria-selected={adminSection === section}
                onClick={() => setAdminSection(section)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors min-h-10",
                  adminSection === section
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {sectionLabel(section)}
              </button>
            )
          })}
        </div>

        {adminSection === "overview" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-primary/20 bg-primary/5 p-4 shadow-sm">
                <p className={videosAdminLabelClass}>{tv.overviewVideos}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">
                  {videos.length}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-border/80 bg-card p-4 shadow-sm">
                <p className={videosAdminLabelClass}>{tv.overviewOffline}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">
                  {videos.filter((v) => localItemHasStoredFile(v)).length}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-border/80 bg-card p-4 shadow-sm">
                <p className={videosAdminLabelClass}>{tv.overviewSeries}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground mt-0.5">
                  {seriesCatalog.series.length}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{tv.overviewTopWatched}</p>
              {videoStatsRanked.length === 0 ? (
                <p className={videosAdminHintClass}>{tv.statsEmpty}</p>
              ) : (
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {videoStatsRanked.slice(0, 3).map((item, rank) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-3 rounded-2xl border border-border/80 bg-card px-3.5 py-2.5 text-sm shadow-sm min-w-0"
                    >
                      <span className="truncate min-w-0 font-medium text-foreground">
                        <span className="text-muted-foreground tabular-nums mr-1.5">
                          {rank + 1}.
                        </span>
                        {item.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-xs font-semibold text-primary">
                        {item.viewCount ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="rounded-full" onClick={() => setAdminSection("library")}>
                {tv.overviewGoLibrary}
              </Button>
              <Button type="button" variant="secondary" className="rounded-full" onClick={() => setAdminSection("series")}>
                {tv.overviewGoSeries}
              </Button>
              <Button type="button" variant="secondary" className="rounded-full" onClick={() => setAdminSection("stats")}>
                {tv.overviewGoStats}
              </Button>
              <Button type="button" variant="secondary" className="rounded-full" onClick={() => setAdminSection("design")}>
                {tv.overviewGoDesign}
              </Button>
            </div>
            {cloudWarning ? (
              <p className="text-xs font-medium text-foreground rounded-2xl bg-secondary/50 border border-border/80 px-4 py-2.5">
                {cloudWarning}
              </p>
            ) : (
              <p className={videosAdminHintClass}>{tv.bucketHint}</p>
            )}
          </div>
        ) : null}

        {adminSection === "design" ? (
          <div className="space-y-4 rounded-[1.75rem] border-2 border-primary/25 bg-primary/5 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Clapperboard className="h-5 w-5 text-primary shrink-0" aria-hidden />
              <h3 className="text-base font-semibold text-foreground">{tv.layoutLabel}</h3>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {tv.layoutLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {GALLERY_LAYOUTS.map((layout) => (
                  <button
                    key={layout}
                    type="button"
                    onClick={() => void handleGalleryLayoutChange(layout)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                      galleryLayout === layout
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {galleryLayoutLabel(layout)}
                  </button>
                ))}
              </div>
            </div>
            {galleryLayout === "poster" ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {tv.columnsLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {GALLERY_COLUMNS.map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => void handleGalleryColumnsChange(cols)}
                      className={cn(
                        "inline-flex min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold tabular-nums transition-colors",
                        galleryColumns === cols
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                      aria-label={
                        cols === 2
                          ? tv.columns2
                          : cols === 3
                            ? tv.columns3
                            : cols === 4
                              ? tv.columns4
                              : cols === 5
                                ? tv.columns5
                                : tv.columns6
                      }
                    >
                      {cols}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground rounded-xl border border-border bg-muted/40 px-3 py-2">
                {tv.columnsPosterOnly}
              </p>
            )}
            <div>
              <label className={videosAdminLabelClass}>{tv.defaultSortLabel}</label>
              <select
                value={galleryDefaultSort}
                onChange={(e) =>
                  void handleGallerySortChange(e.target.value as GalleryDefaultSort)
                }
                className={cn(videosAdminSelectClass, "max-w-md")}
                style={videosAdminSelectStyle}
              >
                {GALLERY_SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {gallerySortLabel(sort)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {adminSection === "stats" ? (
          <div className={cn(videosAdminPanelClass, "space-y-3")}>
            <div className="flex flex-wrap items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary shrink-0" aria-hidden />
              <p className="text-sm font-semibold text-foreground">{tv.statsTitle}</p>
            </div>
            <p className="text-xs text-muted-foreground">{tv.statsHint}</p>
            {loading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tv.loading}
              </div>
            ) : videoStatsRanked.length === 0 ? (
              <p className={cn(videosAdminHintClass, "text-center")}>{tv.statsEmpty}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6">
                {videoStatsRanked.map((item, rank) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 rounded-2xl border border-border/80 bg-secondary/25 px-3.5 py-2.5 min-w-0"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground pt-0.5">
                        {rank + 1}.
                      </span>
                      <p className="font-medium text-sm truncate min-w-0 flex-1">{item.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-5 text-xs text-muted-foreground tabular-nums">
                      <span>
                        {tv.statsViews}: {item.viewCount ?? 0}
                      </span>
                      <span>
                        {tv.statsViewsToday}: {effectiveViewCountToday(item)}
                      </span>
                      <span>
                        {tv.statsWatchTime}: {formatWatchDuration(item.totalWatchedSeconds)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {adminSection === "advanced" ? (
          <div className="space-y-4">
            {cloudWarning ? (
              <p className="text-xs font-medium text-foreground rounded-2xl bg-secondary/50 border border-border/80 px-4 py-2.5">
                {cloudWarning}
              </p>
            ) : (
              <p className={videosAdminHintClass}>{tv.bucketHint}</p>
            )}

            <div className={videosAdminPanelClass}>
              <p className="text-sm font-semibold text-foreground">{tv.downloadSettingsTitle}</p>
              <p className="text-xs text-amber-900 dark:text-amber-100 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5">
                {tv.sideloadDownloadHint}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={videosAdminLabelClass}>{tv.qualityLabel}</label>
                  <select
                    value={defaultQuality}
                    onChange={(e) =>
                      void handleDefaultQualityChange(e.target.value as VideoDownloadQuality)
                    }
                    className={videosAdminSelectClass}
                    style={videosAdminSelectStyle}
                    disabled={busy}
                  >
                    {QUALITY_OPTIONS.map((q) => (
                      <option key={q} value={q}>
                        {qualityLabel(q)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={videosAdminLabelClass}>{tv.perVideoQuality}</label>
                  <select
                    value={addQualityOverride}
                    onChange={(e) =>
                      setAddQualityOverride(
                        e.target.value === "default"
                          ? "default"
                          : (e.target.value as VideoDownloadQuality),
                      )
                    }
                    className={videosAdminSelectClass}
                    style={videosAdminSelectStyle}
                    disabled={busy}
                  >
                    <option value="default">{tv.qualityLabel}</option>
                    {QUALITY_OPTIONS.map((q) => (
                      <option key={q} value={q}>
                        {qualityLabel(q)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={videosAdminPanelClass}>
              <p className="text-sm font-semibold text-foreground">{tv.parentalTitle}</p>
              <p className="text-xs text-muted-foreground">{tv.parentalHint}</p>
              <div>
                <label className={videosAdminLabelClass}>{tv.defaultWatchLimitLabel}</label>
                <input
                  type="number"
                  min={0}
                  value={advancedSettings.defaultWatchLimitMinutes ?? ""}
                  placeholder={tv.defaultWatchLimitNone}
                  className={cn(videosAdminFieldClass, "max-w-xs")}
                  disabled={busy}
                  onChange={(e) => {
                    const raw = e.target.value.trim()
                    const minutes = raw === "" ? null : Number.parseInt(raw, 10)
                    void persistAdvanced({
                      ...advancedSettings,
                      defaultWatchLimitMinutes:
                        minutes != null && Number.isFinite(minutes) && minutes > 0
                          ? minutes
                          : null,
                    })
                  }}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">{tv.defaultWatchLimitHint}</p>
              </div>
              <div className={videosAdminSwitchRowClass}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{tv.wifiOnlyLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tv.wifiOnlyHint}</p>
                </div>
                <Switch
                  checked={advancedSettings.wifiOnlyDownloads}
                  disabled={busy}
                  className={videosAdminSwitchClass}
                  onCheckedChange={(checked) =>
                    void persistAdvanced({
                      ...advancedSettings,
                      wifiOnlyDownloads: checked,
                    })
                  }
                  aria-label={tv.wifiOnlyLabel}
                />
              </div>
            </div>

            <div className={videosAdminPanelClass}>
              <p className="text-sm font-semibold text-foreground">{tv.playbackTitle}</p>
              <div className={videosAdminSwitchRowClass}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{tv.autoplayNextLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tv.autoplayNextHint}</p>
                </div>
                <Switch
                  checked={advancedSettings.autoplayNextEpisode}
                  disabled={busy}
                  className={videosAdminSwitchClass}
                  onCheckedChange={(checked) =>
                    void persistAdvanced({
                      ...advancedSettings,
                      autoplayNextEpisode: checked,
                    })
                  }
                  aria-label={tv.autoplayNextLabel}
                />
              </div>
              <div className={videosAdminSwitchRowClass}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{tv.captionsPreferLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tv.captionsPreferHint}</p>
                </div>
                <Switch
                  checked={advancedSettings.showCaptionsWhenAvailable}
                  disabled={busy}
                  className={videosAdminSwitchClass}
                  onCheckedChange={(checked) =>
                    void persistAdvanced({
                      ...advancedSettings,
                      showCaptionsWhenAvailable: checked,
                    })
                  }
                  aria-label={tv.captionsPreferLabel}
                />
              </div>
            </div>

            <div className={videosAdminPanelClass}>
              <p className="text-sm font-semibold text-foreground">{tv.storageTitle}</p>
              <p className="text-sm text-foreground">
                {offlineStorageStats.count === 0
                  ? tv.storageOfflineEmpty
                  : tv.storageOfflineSummary
                      .replace("{count}", String(offlineStorageStats.count))
                      .replace("{size}", offlineStorageStats.sizeLabel)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className={videosAdminButtonSecondaryClass}
                  disabled={storageBusy || offlineStorageStats.count === 0}
                  onClick={() => void handleClearAllOffline()}
                >
                  {storageBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  {tv.storageClearAll}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={videosAdminButtonSecondaryClass}
                  disabled={storageBusy}
                  onClick={() => void handleResetAllResume()}
                >
                  {storageBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  {tv.storageResetResume}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {adminSection === "series" ? (
          <VideosAdminSeriesSection
            videos={videos}
            tv={tv}
            gridColumns={adminSeriesColumns}
            onVideosChanged={async () => {
              await loadVideos()
              setSeriesCatalog(await getSeriesCatalog())
            }}
          />
        ) : null}

        {adminSection === "library" ? (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("local")
                  setFile(null)
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  mode === "local"
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <HardDrive className="h-4 w-4" />
                {tv.addLocal}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("youtube")
                  setFile(null)
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  mode === "youtube"
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Youtube className="h-4 w-4" />
                {tv.addYoutube}
              </button>
              <button
                type="button"
                onClick={() => setMode("mp4")}
                disabled={!cloudOk || !syncId}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  mode === "mp4"
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
                  (!cloudOk || !syncId) && "opacity-50",
                )}
              >
                <Upload className="h-4 w-4" />
                {tv.addMp4}
              </button>
            </div>

            <div className="space-y-3 rounded-[1.75rem] bg-secondary/30 border border-border p-4">
              {mode === "local" ? (
                <p className="text-xs text-muted-foreground">{tv.localModeHint}</p>
              ) : null}
              {mode === "youtube" ? (
                <p
                  className={cn(
                    "text-xs rounded-full border px-4 py-2",
                    cloudWarning
                      ? "text-foreground bg-secondary/60 border-border"
                      : "text-muted-foreground bg-muted/60 border-border",
                  )}
                >
                  {cloudWarning ? tv.linkLocalHintCloudDown : tv.linkLocalHint}
                </p>
              ) : null}

              <div>
                <label className={videosAdminLabelClass}>{tv.fieldTitle}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={videosAdminFieldClass}
                  placeholder={tv.titlePlaceholder}
                  disabled={busy}
                />
              </div>

              {mode === "youtube" || mode === "local" ? (
                <div>
                  <label className={videosAdminLabelClass}>
                    {mode === "local" ? tv.localYoutubeOptional : tv.youtubeUrl}
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className={cn(videosAdminFieldClass, "pl-10")}
                      placeholder={tv.videoLinkPlaceholder}
                      disabled={busy}
                    />
                  </div>
                </div>
              ) : null}

              {mode === "mp4" || mode === "local" ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {mode === "local" ? tv.localMp4Optional : tv.mp4File}
                  </p>
                  <label
                    className={cn(
                      "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[1.25rem] border-2 border-dashed border-primary bg-primary/5 px-4 py-3 text-sm transition-colors",
                      "hover:bg-primary/10",
                      "active:bg-primary/15",
                      "has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40",
                      busy && "pointer-events-none cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,.mp4"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="sr-only"
                      disabled={busy}
                    />
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                      <Upload className="h-4 w-4" aria-hidden />
                      {tv.pickMp4}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        file ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {file
                        ? `${file.name} (${Math.round(file.size / 1024 / 1024)} MB)`
                        : tv.pickMp4Hint}
                    </span>
                  </label>
                </div>
              ) : null}

              <Button type="button" onClick={() => void handleSubmit()} disabled={busy} className="rounded-full px-6">
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {tv.submitting}
                  </>
                ) : (
                  tv.submit
                )}
              </Button>
            </div>

            {(error || info) && (
              <div
                className={cn(
                  "rounded-full px-4 py-2 text-sm",
                  error
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                )}
              >
                {error || info}
              </div>
            )}
          </>
        ) : null}
      </div>

      {adminSection === "library" ? (
      <div className="rounded-[2rem] border border-primary/20 bg-card p-5 sm:p-6 space-y-3 shadow-sm">
        <h3 className="font-semibold text-base text-foreground">{tv.listTitle}</h3>

        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {tv.loading}
          </div>
        ) : videos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tv.empty}</p>
        ) : (
          <ul className={galleryColumnsGridClass(adminLibraryColumns)}>
            {videos.map((item) => {
              const youtubeBadge = isYoutubeOriginItem(item)
              const localIdx = localVideosOrdered.findIndex((v) => v.id === item.id)
              const canReorder = item.source === "local" && localIdx >= 0
              const showRetryControls = canOfferYoutubeRedownload(item)
              const showClearStorage = itemCanClearStorage(item)
              // Immer bei Geräte-Import – auch wenn Blob/Pfad fehlt („Nur Link“)
              const showDevicePickHint = item.source === "local" && itemIsDevicePick(item)
              const linkHref = item.sourceUrl?.trim() || item.url?.trim()
              const retryQuality =
                retryQualityById[item.id] ?? item.downloadQuality ?? defaultQuality
              const redownloadLabel =
                localItemHasStoredFile(item) && item.downloadStatus === "done"
                  ? tv.downloadAgain
                  : tv.downloadRetry

              return (
                <li
                  key={item.id}
                  className={cn(videosAdminCardClass, "flex flex-col gap-2 px-4 py-3")}
                >
                  <div className="flex items-start gap-1">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      {youtubeBadge ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {tv.typeYoutube}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            item.type === "youtube"
                              ? "bg-primary/15 text-primary"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {item.type === "youtube" ? tv.typeYoutube : tv.typeMp4}
                        </span>
                      )}
                      {item.source === "local" ? (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {tv.badgeLocal}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {canReorder ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
                            disabled={localIdx <= 0}
                            onClick={() => void handleReorderLocal(item.id, "up")}
                            aria-label={tv.reorderUp}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
                            disabled={localIdx >= localVideosOrdered.length - 1}
                            onClick={() => void handleReorderLocal(item.id, "down")}
                            aria-label={tv.reorderDown}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full text-destructive hover:bg-destructive/10"
                        disabled={deletingId === item.id}
                        onClick={() => void handleDelete(item)}
                        aria-label={tv.delete}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
                    {linkHref && item.source !== "local" ? (
                      <a
                        href={linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground truncate block hover:text-primary"
                      >
                        {linkHref}
                      </a>
                    ) : linkHref && item.source === "local" && item.downloadStatus !== "done" ? (
                      <p className="text-xs text-muted-foreground truncate">{linkHref}</p>
                    ) : item.source === "local" ? (
                      <p className="text-xs text-muted-foreground truncate">{tv.localFileLabel}</p>
                    ) : null}
                    {renderDownloadStatus(item)}
                    {item.source === "local" ? (
                      <p className="text-xs text-muted-foreground">
                        {tv.viewsLabel}: {item.viewCount ?? 0}
                        {" · "}
                        {tv.resumeAt}: {formatMmSs(item.lastPositionSeconds)}
                      </p>
                    ) : null}
                    {item.source === "local" ? (
                      <p className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
                        {formatAddedAt(item.createdAt, lang) ? (
                          <span>
                            {tv.addedAt}: {formatAddedAt(item.createdAt, lang)}
                          </span>
                        ) : null}
                        <span>
                          {formatVideoFileSize(item.fileSizeBytes)
                            ? tv.storageUsed.replace(
                                "{size}",
                                formatVideoFileSize(item.fileSizeBytes) ?? "",
                              )
                            : tv.storageLinkOnly}
                        </span>
                      </p>
                    ) : null}
                    {item.source === "local" ? (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {tv.watchLimitLabel}
                        </label>
                        <input
                          type="number"
                          min={0}
                          defaultValue={item.watchLimitMinutes ?? ""}
                          placeholder={tv.watchLimitNone}
                          className={cn(
                            videosAdminFieldClass,
                            "w-24 min-h-9 rounded-xl px-3 py-1 text-xs",
                          )}
                          onBlur={(e) => void handleWatchLimitChange(item.id, e.target.value)}
                        />
                      </div>
                    ) : null}
                    {showClearStorage ? (
                      <div className="pt-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(videosAdminButtonSecondaryClass, "min-h-10 px-4 text-xs")}
                          disabled={clearStorageBusyId === item.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleClearStorage(item)
                          }}
                        >
                          {clearStorageBusyId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : null}
                          {tv.clearStorage}
                        </Button>
                      </div>
                    ) : null}
                    {showDevicePickHint ? (
                      <p className="text-xs text-muted-foreground pt-0.5">{tv.devicePickStorageHint}</p>
                    ) : null}
                    {showRetryControls ? (
                      <div
                        className="flex flex-wrap items-center gap-2 pt-1"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <select
                          value={retryQuality}
                          onChange={(e) => {
                            e.stopPropagation()
                            setRetryQualityById((prev) => ({
                              ...prev,
                              [item.id]: e.target.value as VideoDownloadQuality,
                            }))
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            videosAdminSelectClass,
                            "min-h-10 w-auto rounded-xl px-3 py-2 text-xs",
                          )}
                          style={videosAdminSelectStyle}
                          aria-label={tv.perVideoQuality}
                        >
                          {QUALITY_OPTIONS.map((q) => (
                            <option key={q} value={q}>
                              {qualityLabel(q)}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            videosAdminButtonSecondaryClass,
                            "min-h-10 px-4 text-xs gap-1.5",
                          )}
                          disabled={retryBusyId === item.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleRetryDownload(item)
                          }}
                        >
                          {retryBusyId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5" />
                          )}
                          {redownloadLabel}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

      </div>
      ) : null}
    </div>
  )
}
