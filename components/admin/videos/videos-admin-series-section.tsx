"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  videosAdminButtonDangerClass,
  videosAdminButtonSecondaryClass,
  videosAdminCardClass,
  videosAdminFieldClass,
  videosAdminLabelClass,
  videosAdminPanelClass,
  videosAdminSelectClass,
  videosAdminSelectStyle,
} from "@/components/admin/videos/videos-admin-field-styles"
import { galleryColumnsGridClass } from "@/lib/videos/gallery-grid-classes"
import type { GalleryColumns } from "@/lib/videos/gallery-settings"
import { cn } from "@/lib/utils"
import type { VideoItem, VideoSeason, VideoSeries } from "@/types/video"
import {
  assignVideoToSeason,
  createSeason,
  createSeries,
  deleteSeason,
  deleteSeries,
  getSeriesCatalog,
  renameSeason,
  renameSeries,
  seasonsForSeries,
  setEpisodeNumber,
  unassignVideoFromSeries,
  type SeriesCatalogState,
} from "@/lib/videos/series-catalog"

type Tv = {
  seriesTitle: string
  seriesHint: string
  seriesEmpty: string
  seriesAdd: string
  seriesNamePlaceholder: string
  seriesRename: string
  seriesDelete: string
  seriesDeleteConfirm: string
  seasonAdd: string
  seasonNamePlaceholder: string
  seasonDelete: string
  seasonDeleteConfirm: string
  seasonRename: string
  assignVideo: string
  assignPickVideo: string
  assignPickSeason: string
  unassignVideo: string
  episodeLabel: string
  episodeMoveUp: string
  episodeMoveDown: string
  noSeasonsYet: string
  noEpisodesYet: string
  unassignedVideos: string
  loading: string
}

type Props = {
  videos: VideoItem[]
  tv: Tv
  gridColumns: GalleryColumns
  onVideosChanged: () => void | Promise<void>
}

export function VideosAdminSeriesSection({
  videos,
  tv,
  gridColumns,
  onVideosChanged,
}: Props) {
  const [state, setState] = useState<SeriesCatalogState>({ series: [], seasons: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null)
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null)
  const [newSeriesTitle, setNewSeriesTitle] = useState("")
  const [seasonTitleBySeries, setSeasonTitleBySeries] = useState<Record<string, string>>({})
  const [assignVideoId, setAssignVideoId] = useState("")
  const [assignSeasonId, setAssignSeasonId] = useState("")

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setState(await getSeriesCatalog())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const localVideos = useMemo(
    () => videos.filter((v) => v.source === "local"),
    [videos],
  )

  const unassigned = useMemo(
    () => localVideos.filter((v) => !v.seriesId || !v.seasonId),
    [localVideos],
  )

  const episodesInSeason = useCallback(
    (seasonId: string) =>
      localVideos
        .filter((v) => v.seasonId === seasonId)
        .sort((a, b) => (a.episodeNumber ?? 999) - (b.episodeNumber ?? 999)),
    [localVideos],
  )

  async function handleCreateSeries() {
    setBusy(true)
    try {
      const s = await createSeries(newSeriesTitle)
      setNewSeriesTitle("")
      setExpandedSeriesId(s.id)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteSeries(series: VideoSeries) {
    if (!window.confirm(tv.seriesDeleteConfirm.replace("{title}", series.title))) return
    setBusy(true)
    try {
      await deleteSeries(series.id)
      if (expandedSeriesId === series.id) setExpandedSeriesId(null)
      await reload()
      await onVideosChanged()
    } finally {
      setBusy(false)
    }
  }

  async function handleRenameSeries(series: VideoSeries) {
    const next = window.prompt(tv.seriesRename, series.title)
    if (next == null || !next.trim()) return
    setBusy(true)
    try {
      await renameSeries(series.id, next)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateSeason(seriesId: string) {
    setBusy(true)
    try {
      const title = seasonTitleBySeries[seriesId] ?? ""
      await createSeason(seriesId, title || undefined)
      setSeasonTitleBySeries((prev) => ({ ...prev, [seriesId]: "" }))
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteSeason(season: VideoSeason) {
    if (!window.confirm(tv.seasonDeleteConfirm.replace("{title}", season.title))) return
    setBusy(true)
    try {
      await deleteSeason(season.id)
      if (expandedSeasonId === season.id) setExpandedSeasonId(null)
      await reload()
      await onVideosChanged()
    } finally {
      setBusy(false)
    }
  }

  async function handleRenameSeason(season: VideoSeason) {
    const next = window.prompt(tv.seasonRename, season.title)
    if (next == null || !next.trim()) return
    setBusy(true)
    try {
      await renameSeason(season.id, next)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function handleAssign() {
    if (!assignVideoId || !assignSeasonId) return
    const season = state.seasons.find((s) => s.id === assignSeasonId)
    if (!season) return
    setBusy(true)
    try {
      await assignVideoToSeason({
        videoId: assignVideoId,
        seriesId: season.seriesId,
        seasonId: season.id,
      })
      setAssignVideoId("")
      await onVideosChanged()
    } finally {
      setBusy(false)
    }
  }

  async function handleUnassign(videoId: string) {
    setBusy(true)
    try {
      await unassignVideoFromSeries(videoId)
      await onVideosChanged()
    } finally {
      setBusy(false)
    }
  }

  async function moveEpisode(seasonId: string, videoId: string, dir: -1 | 1) {
    const eps = episodesInSeason(seasonId)
    const idx = eps.findIndex((v) => v.id === videoId)
    if (idx < 0) return
    const swap = eps[idx + dir]
    if (!swap) return
    const aNum = eps[idx].episodeNumber ?? idx + 1
    const bNum = swap.episodeNumber ?? idx + dir + 1
    setBusy(true)
    try {
      await setEpisodeNumber(eps[idx].id, bNum)
      await setEpisodeNumber(swap.id, aNum)
      await onVideosChanged()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{tv.loading}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" aria-hidden />
          {tv.seriesTitle}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{tv.seriesHint}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={newSeriesTitle}
          onChange={(e) => setNewSeriesTitle(e.target.value)}
          placeholder={tv.seriesNamePlaceholder}
          className={cn(videosAdminFieldClass, "flex-1")}
          disabled={busy}
        />
        <Button
          type="button"
          className="rounded-full shrink-0"
          disabled={busy}
          onClick={() => void handleCreateSeries()}
        >
          <Plus className="h-4 w-4 mr-1" />
          {tv.seriesAdd}
        </Button>
      </div>

      {state.series.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{tv.seriesEmpty}</p>
      ) : (
        <>
          <ul className={galleryColumnsGridClass(gridColumns)}>
          {state.series.map((series) => {
            const seasons = seasonsForSeries(state, series.id)
            const open = expandedSeriesId === series.id
            return (
              <li
                key={series.id}
                className={cn(
                  videosAdminCardClass,
                  "overflow-hidden",
                  open && "col-span-full",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-primary/5">
                  <button
                    type="button"
                    className="min-h-10 flex-1 text-left font-semibold text-foreground"
                    onClick={() =>
                      setExpandedSeriesId((id) => (id === series.id ? null : series.id))
                    }
                  >
                    {series.title}
                    <span className="ml-2 text-xs font-normal text-primary tabular-nums">
                      ({seasons.length})
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={videosAdminButtonSecondaryClass}
                    disabled={busy}
                    onClick={() => void handleRenameSeries(series)}
                  >
                    {tv.seriesRename}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={videosAdminButtonDangerClass}
                    disabled={busy}
                    onClick={() => void handleDeleteSeries(series)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {open ? (
                  <div className="space-y-3 border-t border-border/70 px-4 py-3 bg-card/60">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={seasonTitleBySeries[series.id] ?? ""}
                        onChange={(e) =>
                          setSeasonTitleBySeries((prev) => ({
                            ...prev,
                            [series.id]: e.target.value,
                          }))
                        }
                        placeholder={tv.seasonNamePlaceholder}
                        className={cn(videosAdminFieldClass, "flex-1 min-h-10 py-2")}
                        disabled={busy}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full"
                        disabled={busy}
                        onClick={() => void handleCreateSeason(series.id)}
                      >
                        {tv.seasonAdd}
                      </Button>
                    </div>

                    {seasons.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{tv.noSeasonsYet}</p>
                    ) : (
                      <ul className="space-y-2">
                        {seasons.map((season) => {
                          const eps = episodesInSeason(season.id)
                          const seasonOpen = expandedSeasonId === season.id
                          return (
                            <li
                              key={season.id}
                              className="rounded-xl border border-border bg-card/80"
                            >
                              <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                                <button
                                  type="button"
                                  className="min-h-9 flex-1 text-left text-sm font-medium"
                                  onClick={() =>
                                    setExpandedSeasonId((id) =>
                                      id === season.id ? null : season.id,
                                    )
                                  }
                                >
                                  {season.title}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({eps.length})
                                  </span>
                                </button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={videosAdminButtonSecondaryClass}
                                  disabled={busy}
                                  onClick={() => void handleRenameSeason(season)}
                                >
                                  {tv.seasonRename}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={videosAdminButtonDangerClass}
                                  disabled={busy}
                                  onClick={() => void handleDeleteSeason(season)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              {seasonOpen ? (
                                <div className="border-t border-border px-3 py-2 space-y-2">
                                  {eps.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {tv.noEpisodesYet}
                                    </p>
                                  ) : (
                                    eps.map((ep, i) => (
                                      <div
                                        key={ep.id}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <span className="text-xs text-muted-foreground tabular-nums w-16 shrink-0">
                                          {tv.episodeLabel.replace(
                                            "{n}",
                                            String(ep.episodeNumber ?? i + 1),
                                          )}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">
                                          {ep.title}
                                        </span>
                                        <button
                                          type="button"
                                          className="touch-target-min p-1.5 rounded-lg hover:bg-secondary"
                                          aria-label={tv.episodeMoveUp}
                                          disabled={busy || i === 0}
                                          onClick={() => void moveEpisode(season.id, ep.id, -1)}
                                        >
                                          <ChevronUp className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          className="touch-target-min p-1.5 rounded-lg hover:bg-secondary"
                                          aria-label={tv.episodeMoveDown}
                                          disabled={busy || i === eps.length - 1}
                                          onClick={() => void moveEpisode(season.id, ep.id, 1)}
                                        >
                                          <ChevronDown className="h-4 w-4" />
                                        </button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="rounded-full text-xs"
                                          disabled={busy}
                                          onClick={() => void handleUnassign(ep.id)}
                                        >
                                          {tv.unassignVideo}
                                        </Button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
          </ul>
        </>
      )}

      <div className={videosAdminPanelClass}>
        <p className="text-sm font-semibold text-foreground">{tv.assignVideo}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={videosAdminLabelClass}>{tv.assignPickVideo}</label>
            <select
              value={assignVideoId}
              onChange={(e) => setAssignVideoId(e.target.value)}
              className={videosAdminSelectClass}
              style={videosAdminSelectStyle}
              disabled={busy}
            >
              <option value="">{tv.assignPickVideo}</option>
              {unassigned.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={videosAdminLabelClass}>{tv.assignPickSeason}</label>
            <select
              value={assignSeasonId}
              onChange={(e) => setAssignSeasonId(e.target.value)}
              className={videosAdminSelectClass}
              style={videosAdminSelectStyle}
              disabled={busy}
            >
              <option value="">{tv.assignPickSeason}</option>
              {state.series.flatMap((ser) =>
                seasonsForSeries(state, ser.id).map((sea) => (
                  <option key={sea.id} value={sea.id}>
                    {ser.title} – {sea.title}
                  </option>
                )),
              )}
            </select>
          </div>
        </div>
        <Button
          type="button"
          className="rounded-full"
          disabled={busy || !assignVideoId || !assignSeasonId}
          onClick={() => void handleAssign()}
        >
          {tv.assignVideo}
        </Button>
      </div>

      {unassigned.length > 0 ? (
        <div className="space-y-2">
          <p className={videosAdminLabelClass}>{tv.unassignedVideos}</p>
          <ul className={galleryColumnsGridClass(gridColumns, "gap-1.5")}>
            {unassigned.map((v) => (
              <li
                key={v.id}
                className="rounded-2xl border border-border/80 bg-card px-3.5 py-2.5 text-sm font-medium text-foreground truncate shadow-sm"
              >
                {v.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
