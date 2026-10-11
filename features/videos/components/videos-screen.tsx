"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Film,
  FolderOpen,
  LayoutGrid,
  List,
  Loader2,
  Rows3,
} from "lucide-react"
import { AppShell } from "@shell/components/app-shell"
import { EmptyState } from "@ui/components/empty-state"
import { Button } from "@ui/components/button"
import { useFamily } from "@/context/family-context"
import { useTranslation } from "@/hooks/use-translation"
import { useVideos } from "@/hooks/useVideos"
import { UniversalVideoPlayer } from "@/components/videos/universal-video-player"
import type { VideoItem, VideoSeason, VideoSeries } from "@/types/video"
import type { Language } from "@/lib/i18n"
import {
  getGallerySettings,
  setGallerySettings,
  type GalleryColumns,
  type GalleryDefaultSort,
  type GalleryLayout,
  type VideosGallerySettings,
} from "@/lib/videos/gallery-settings"
import { galleryColumnsGridClass } from "@/lib/videos/gallery-grid-classes"

const GALLERY_COLUMN_OPTIONS: GalleryColumns[] = [2, 3, 4, 5, 6]
const GALLERY_LAYOUTS: GalleryLayout[] = ["poster", "list", "compact"]
import {
  formatVideoFileSize,
  youtubeThumbnailFromUrl,
} from "@/lib/videos/local-catalog"
import { getAdvancedSettings } from "@/lib/videos/advanced-settings"
import {
  findNextEpisodeInSeason,
  getSeriesCatalog,
  seasonsForSeries,
  type SeriesCatalogState,
} from "@/lib/videos/series-catalog"
import { cn } from "@/lib/utils"
import Link from "next/link"

type GalleryBrowse =
  | { level: "root" }
  | { level: "series"; series: VideoSeries }
  | { level: "season"; series: VideoSeries; season: VideoSeason }

const LOCALE_BY_LANG: Record<Language, string> = {
  de: "de-DE",
  gb: "en-GB",
  es: "es-ES",
  tr: "tr-TR",
  ru: "ru-RU",
  ro: "ro-RO",
}

function formatDuration(seconds?: number): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return null
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/** Kurzes locale Datum für Galerie-Karten (fehlende/ungültige Werte → null). */
function formatAddedAtShort(iso: string | undefined, lang: Language): string | null {
  if (!iso?.trim()) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang] ?? "de-DE", {
      dateStyle: "short",
    }).format(d)
  } catch {
    return null
  }
}

function resolveThumb(video: VideoItem): string | undefined {
  if (video.thumbnailUrl?.trim()) return video.thumbnailUrl.trim()
  const origin = video.sourceUrl?.trim() || (video.type === "youtube" ? video.url : "")
  if (origin) return youtubeThumbnailFromUrl(origin)
  return undefined
}

function sortVideos(items: VideoItem[], sort: GalleryDefaultSort): VideoItem[] {
  const copy = [...items]
  switch (sort) {
    case "recent":
      return copy.sort((a, b) => {
        const ap = a.lastPositionSeconds ?? 0
        const bp = b.lastPositionSeconds ?? 0
        if (bp !== ap) return bp - ap
        return (b.viewCount ?? 0) - (a.viewCount ?? 0)
      })
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }))
    case "newest":
      return copy.sort((a, b) => {
        const at = a.createdAt ? Date.parse(a.createdAt) : 0
        const bt = b.createdAt ? Date.parse(b.createdAt) : 0
        return bt - at
      })
    case "sortOrder":
    default:
      return copy.sort((a, b) => {
        const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER
        const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER
        if (ao !== bo) return ao - bo
        const at = a.createdAt ? Date.parse(a.createdAt) : 0
        const bt = b.createdAt ? Date.parse(b.createdAt) : 0
        return bt - at
      })
  }
}

function tv(
  translate: (path: string, params?: Record<string, string | number>) => string,
  key: string,
  fallback: string,
  params?: Record<string, string | number>,
): string {
  const value = translate(key, params)
  return value === key ? fallback : value
}

function ResumeProgress({ video }: { video: VideoItem }) {
  const pos = video.lastPositionSeconds ?? 0
  const dur = video.durationSeconds
  if (pos <= 5 || typeof dur !== "number" || dur <= 0) return null
  const pct = Math.min(100, Math.max(0, (pos / dur) * 100))
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-1 bg-black/35"
      aria-hidden
    >
      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function VideoThumb({
  video,
  className,
  iconClassName,
}: {
  video: VideoItem
  className?: string
  iconClassName?: string
}) {
  const thumb = resolveThumb(video)
  const duration = formatDuration(video.durationSeconds)

  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-muted", className)}>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-secondary/40 to-muted">
          <Film className={cn("text-primary/55", iconClassName ?? "h-10 w-10")} />
        </div>
      )}
      {typeof video.durationSeconds === "number" && Number.isFinite(video.durationSeconds) ? (
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm">
          {duration ?? "0:00"}
        </span>
      ) : null}
      <ResumeProgress video={video} />
      {video.isDownloaded || video.downloadStatus === "done" || video.source === "local" ? (
        <span className="absolute left-1.5 top-1.5 inline-flex items-center rounded-full bg-emerald-600/95 p-1 text-white shadow-sm">
          <CheckCircle2 className="h-3 w-3" aria-hidden />
        </span>
      ) : null}
      {video.downloadStatus === "downloading" || video.downloadStatus === "queued" ? (
        <span className="absolute left-1.5 bottom-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {Math.round(video.downloadProgress ?? 0)}%
        </span>
      ) : null}
    </div>
  )
}

function VideoMetaLine({
  video,
  translate,
  lang,
  layout,
}: {
  video: VideoItem
  translate: ReturnType<typeof useTranslation>["translate"]
  lang: Language
  layout: GalleryLayout
}) {
  const compact = layout === "compact"
  const size = formatVideoFileSize(video.fileSizeBytes)
  const duration = formatDuration(video.durationSeconds)
  const added = formatAddedAtShort(video.createdAt, lang)
  const typeLabel =
    video.sourceUrl || video.type === "youtube"
      ? translate("pageVideos.typeYoutube")
      : translate("pageVideos.typeMp4")

  const parts: string[] = []

  // Poster/Liste: Typ zuerst; Compact: Dauer + Datum priorisieren
  if (!compact) {
    parts.push(typeLabel)
  }

  if (duration) {
    parts.push(
      compact
        ? duration
        : tv(translate, "pageVideos.durationLabel", `Dauer ${duration}`, { time: duration }),
    )
  }

  if (added) {
    parts.push(
      compact
        ? added
        : tv(translate, "pageVideos.addedAtLabel", `Hinzugefügt ${added}`, { date: added }),
    )
  }

  if (compact) {
    parts.push(typeLabel)
  }

  // Aufrufe / Größe: Poster & Liste; Compact bewusst weglassen (weniger Clutter)
  if (!compact && typeof video.viewCount === "number" && video.viewCount > 0) {
    parts.push(translate("pageVideos.viewsLabel", { n: video.viewCount }))
  }
  if (!compact && size) {
    parts.push(tv(translate, "pageVideos.fileSizeLabel", size, { size }))
  }

  if (parts.length === 0) return null

  return (
    <p
      className={cn(
        "text-xs text-muted-foreground",
        compact ? "mt-0.5 line-clamp-1" : "mt-0.5",
      )}
    >
      {parts.join(" · ")}
    </p>
  )
}

function VideoCard({
  video,
  layout,
  downloading,
  onOpen,
  onDownload,
}: {
  video: VideoItem
  layout: GalleryLayout
  downloading: boolean
  onOpen: () => void
  onDownload: () => void
}) {
  const { translate, lang } = useTranslation()
  const canDownload = video.type === "mp4" && video.source !== "local" && !video.isDownloaded
  const showContinue = (video.lastPositionSeconds ?? 0) > 5
  const continueLabel = tv(translate, "pageVideos.continueWatching", "Weiterschauen")

  const cardClass = cn(
    "fdt-hero-surface group relative flex cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-card/90 text-left shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]",
    layout === "poster" && "flex-col",
    layout === "list" && "flex-row gap-3 p-2.5",
    layout === "compact" && "flex-row items-center gap-2.5 p-2",
  )

  const thumbClass =
    layout === "poster"
      ? "aspect-video w-full"
      : layout === "list"
        ? "aspect-video w-36 rounded-xl sm:w-44"
        : "aspect-video h-14 w-24 rounded-lg"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cardClass}
      aria-label={video.title}
    >
      <VideoThumb
        video={video}
        className={thumbClass}
        iconClassName={layout === "compact" ? "h-6 w-6" : undefined}
      />
      <div
        className={cn(
          "min-w-0 flex-1",
          layout === "poster" ? "p-3" : "py-0.5 pr-1",
        )}
      >
        <h3
          className={cn(
            "font-semibold text-foreground",
            layout === "compact" ? "line-clamp-1 text-sm" : "line-clamp-2 text-sm",
          )}
        >
          {video.title}
        </h3>
        <VideoMetaLine video={video} translate={translate} lang={lang} layout={layout} />
        {showContinue ? (
          <p className="mt-1 text-xs font-medium text-primary">{continueLabel}</p>
        ) : null}
      </div>
      {canDownload && layout !== "compact" ? (
        <button
          type="button"
          className={cn(
            "touch-target-min shrink-0 self-center rounded-xl border border-border/80 bg-background/90 p-2 text-foreground hover:bg-secondary",
            layout === "poster" &&
              "absolute bottom-2 right-2 shadow-sm sm:static sm:shadow-none",
          )}
          aria-label={translate("pageVideos.download")}
          disabled={downloading}
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>
      ) : null}
    </div>
  )
}

function FolderCard({
  title,
  subtitle,
  onOpen,
  ariaLabel,
}: {
  title: string
  subtitle: string
  onOpen: () => void
  ariaLabel: string
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className="fdt-hero-surface group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/90 text-left shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
      aria-label={ariaLabel}
    >
      <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/40 to-muted">
        <FolderOpen className="h-12 w-12 text-primary/70" aria-hidden />
      </div>
      <div className="min-w-0 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

export function VideosScreen() {
  const { translate } = useTranslation()
  const { state } = useFamily()
  const videosEnabled = state.settings.videosEnabled !== false
  const { videos, status, error, syncId, refresh, downloadVideo, isDownloadingId } = useVideos({
    enabled: videosEnabled,
  })
  const [selected, setSelected] = useState<VideoItem | null>(null)
  const [gallery, setGallery] = useState<VideosGallerySettings | null>(null)
  const [autoplayNextEpisode, setAutoplayNextEpisode] = useState(false)
  const [seriesState, setSeriesState] = useState<SeriesCatalogState>({
    series: [],
    seasons: [],
  })
  const [browse, setBrowse] = useState<GalleryBrowse>({ level: "root" })

  useEffect(() => {
    void getGallerySettings().then(setGallery)
  }, [])

  useEffect(() => {
    void getAdvancedSettings().then((s) => setAutoplayNextEpisode(s.autoplayNextEpisode))
  }, [selected])

  useEffect(() => {
    void getSeriesCatalog().then(setSeriesState)
  }, [videos])

  const persistGallery = useCallback(
    async (patch: Partial<VideosGallerySettings>) => {
      const next: VideosGallerySettings = {
        galleryLayout: patch.galleryLayout ?? gallery?.galleryLayout ?? "poster",
        defaultSort: patch.defaultSort ?? gallery?.defaultSort ?? "sortOrder",
        galleryColumns: patch.galleryColumns ?? gallery?.galleryColumns ?? 2,
        adminSeriesColumns: patch.adminSeriesColumns ?? gallery?.adminSeriesColumns ?? 3,
        adminLibraryColumns: patch.adminLibraryColumns ?? gallery?.adminLibraryColumns ?? 3,
      }
      setGallery(next)
      await setGallerySettings(next)
    },
    [gallery],
  )

  const selectedLive = useMemo(() => {
    if (!selected) return null
    return videos.find((v) => v.id === selected.id) ?? selected
  }, [selected, videos])

  const layout = gallery?.galleryLayout ?? "poster"
  const columns: GalleryColumns = gallery?.galleryColumns ?? 2
  const sort = gallery?.defaultSort ?? "sortOrder"

  const columnAria = useCallback(
    (cols: GalleryColumns) => {
      const key =
        cols === 2
          ? "pageVideos.columns2"
          : cols === 3
            ? "pageVideos.columns3"
            : cols === 4
              ? "pageVideos.columns4"
              : cols === 5
                ? "pageVideos.columns5"
                : "pageVideos.columns6"
      return tv(translate, key, `${cols}`, { n: cols })
    },
    [translate],
  )

  const gridClass =
    layout === "poster"
      ? galleryColumnsGridClass(columns)
      : layout === "list"
        ? "flex flex-col gap-2.5"
        : "flex flex-col gap-1.5"

  const assignedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const v of videos) {
      if (v.seriesId && v.seasonId) ids.add(v.id)
    }
    return ids
  }, [videos])

  const unassignedVideos = useMemo(() => {
    return sortVideos(
      videos.filter((v) => !assignedIds.has(v.id)),
      sort,
    )
  }, [videos, assignedIds, sort])

  const seasonEpisodes = useMemo(() => {
    if (browse.level !== "season") return []
    return sortVideos(
      videos.filter((v) => v.seasonId === browse.season.id),
      "sortOrder",
    ).sort((a, b) => (a.episodeNumber ?? 999) - (b.episodeNumber ?? 999))
  }, [browse, videos])

  const rootSeries = seriesState.series

  if (!videosEnabled) {
    return (
      <AppShell>
        <EmptyState
          icon="🎬"
          title={translate("pageVideos.disabledTitle")}
          description={translate("pageVideos.disabledDescription")}
          action={
            <Link href="/admin">
              <Button type="button">{translate("pageVideos.openSettings")}</Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  const heading =
    browse.level === "root"
      ? translate("pageVideos.title")
      : browse.level === "series"
        ? browse.series.title
        : `${browse.series.title} · ${browse.season.title}`

  const subheading =
    browse.level === "root"
      ? translate("pageVideos.subtitle")
      : browse.level === "series"
        ? tv(
            translate,
            "pageVideos.seasonCount",
            `${seasonsForSeries(seriesState, browse.series.id).length} Staffeln`,
            { n: seasonsForSeries(seriesState, browse.series.id).length },
          )
        : tv(translate, "pageVideos.episodeCount", `${seasonEpisodes.length} Folgen`, {
            n: seasonEpisodes.length,
          })

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {browse.level !== "root" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mb-1 -ml-2 rounded-full"
                onClick={() => {
                  if (browse.level === "season") {
                    setBrowse({ level: "series", series: browse.series })
                  } else {
                    setBrowse({ level: "root" })
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {browse.level === "season"
                  ? tv(translate, "pageVideos.backToSeasons", "Zurück zu Staffeln")
                  : tv(translate, "pageVideos.backToSeries", "Zurück zu Serien")}
              </Button>
            ) : null}
            <h1 className="text-2xl font-bold text-foreground truncate">{heading}</h1>
            <p className="text-sm text-muted-foreground">{subheading}</p>
            {browse.level === "root" && !syncId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {translate("pageVideos.localOnlyHint")}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-xl shrink-0"
            disabled={status === "loading"}
            onClick={() => {
              void refresh()
              void getSeriesCatalog().then(setSeriesState)
            }}
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              translate("pageVideos.refresh")
            )}
          </Button>
        </div>

        {(videos.length > 0 || rootSeries.length > 0) && status !== "loading" ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div
              className="flex shrink-0 flex-row items-center gap-0.5 rounded-xl border border-border/70 bg-card/60 p-0.5"
              role="group"
              aria-label={tv(translate, "pageVideos.viewToggleAria", "Ansicht umschalten")}
            >
              {GALLERY_LAYOUTS.map((mode) => {
                const Icon = mode === "poster" ? LayoutGrid : mode === "list" ? List : Rows3
                const label =
                  mode === "poster"
                    ? tv(translate, "pageVideos.viewPoster", "Poster")
                    : mode === "list"
                      ? tv(translate, "pageVideos.viewList", "Liste")
                      : tv(translate, "pageVideos.viewCompact", "Kompakt")
                const active = layout === mode
                return (
                  <Button
                    key={mode}
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-lg touch-manipulation select-none",
                      active && "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
                    )}
                    onClick={() => void persistGallery({ galleryLayout: mode })}
                    aria-label={label}
                    aria-pressed={active}
                    title={label}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </Button>
                )
              })}
            </div>

            {layout === "poster" ? (
              <div
                className="flex shrink-0 flex-row flex-wrap items-center gap-0.5 rounded-xl border border-border/70 bg-card/60 p-0.5"
                role="group"
                aria-label={tv(translate, "pageVideos.columnsToggleAria", "Spaltenanzahl")}
              >
                {GALLERY_COLUMN_OPTIONS.map((cols) => {
                  const active = columns === cols
                  return (
                    <Button
                      key={cols}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-9 min-w-9 rounded-lg px-2.5 text-sm font-semibold tabular-nums touch-manipulation select-none",
                        active && "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
                      )}
                      onClick={() => void persistGallery({ galleryColumns: cols })}
                      aria-label={columnAria(cols)}
                      aria-pressed={active}
                      title={columnAria(cols)}
                    >
                      {cols}
                    </Button>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {error && status === "error" && videos.length === 0 ? (
          <EmptyState
            icon="☁️"
            title={translate("pageVideos.errorTitle")}
            description={translate("pageVideos.errorDescription")}
            action={
              <Button type="button" onClick={() => void refresh()}>
                {translate("pageVideos.retry")}
              </Button>
            }
          />
        ) : null}

        {status === "loading" && videos.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{translate("common.loading")}</span>
          </div>
        ) : null}

        {status !== "loading" &&
        videos.length === 0 &&
        rootSeries.length === 0 &&
        status !== "error" ? (
          <EmptyState
            icon="🎬"
            title={translate("pageVideos.emptyTitle")}
            description={translate("pageVideos.emptyDescription")}
          />
        ) : null}

        {browse.level === "root" ? (
          <div className="space-y-6">
            {rootSeries.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tv(translate, "pageVideos.seriesSection", "Serien")}
                </p>
                <div className={galleryColumnsGridClass(columns)}>
                  {rootSeries.map((series) => {
                    const seasons = seasonsForSeries(seriesState, series.id)
                    const epCount = videos.filter((v) => v.seriesId === series.id).length
                    return (
                      <FolderCard
                        key={series.id}
                        title={series.title}
                        subtitle={`${tv(translate, "pageVideos.seasonCount", `${seasons.length} Staffeln`, { n: seasons.length })} · ${tv(translate, "pageVideos.episodeCount", `${epCount} Folgen`, { n: epCount })}`}
                        ariaLabel={tv(translate, "pageVideos.openSeries", "Serie öffnen")}
                        onOpen={() => setBrowse({ level: "series", series })}
                      />
                    )
                  })}
                </div>
              </div>
            ) : null}

            {unassignedVideos.length > 0 ? (
              <div className="space-y-2">
                {rootSeries.length > 0 ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tv(translate, "pageVideos.unassignedTitle", "Ohne Serie")}
                  </p>
                ) : null}
                <div className={gridClass}>
                  {unassignedVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      layout={layout}
                      video={video}
                      downloading={isDownloadingId === video.id}
                      onOpen={() => setSelected(video)}
                      onDownload={() => {
                        if (video.type !== "mp4") return
                        void downloadVideo(video)
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {browse.level === "series" ? (
          <div className={galleryColumnsGridClass(columns)}>
            {seasonsForSeries(seriesState, browse.series.id).map((season) => {
              const count = videos.filter((v) => v.seasonId === season.id).length
              return (
                <FolderCard
                  key={season.id}
                  title={season.title}
                  subtitle={tv(translate, "pageVideos.episodeCount", `${count} Folgen`, {
                    n: count,
                  })}
                  ariaLabel={tv(translate, "pageVideos.openSeason", "Staffel öffnen")}
                  onOpen={() =>
                    setBrowse({ level: "season", series: browse.series, season })
                  }
                />
              )
            })}
          </div>
        ) : null}

        {browse.level === "season" ? (
          seasonEpisodes.length > 0 ? (
            <div className={gridClass}>
              {seasonEpisodes.map((video) => (
                <VideoCard
                  key={video.id}
                  layout={layout}
                  video={video}
                  downloading={isDownloadingId === video.id}
                  onOpen={() => setSelected(video)}
                  onDownload={() => {
                    if (video.type !== "mp4") return
                    void downloadVideo(video)
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {tv(translate, "pageVideos.episodesTitle", "Folgen")}
            </p>
          )
        ) : null}
      </div>

      {selectedLive ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4 md:p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[96dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border/80 bg-card shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl md:max-w-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedLive.title}
          >
            <UniversalVideoPlayer
              video={selectedLive}
              onClose={() => setSelected(null)}
              onDownloaded={() => {
                void refresh()
              }}
              onCatalogChange={() => {
                void refresh()
              }}
              onEnded={() => {
                if (!autoplayNextEpisode) return
                const next = findNextEpisodeInSeason(videos, selectedLive)
                if (next) setSelected(next)
              }}
            />
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
