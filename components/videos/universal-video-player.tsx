"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Capacitor } from "@capacitor/core"
import { CapacitorVideoPlayer } from "capacitor-video-player"
import {
  Captions,
  Download,
  Gauge,
  Maximize2,
  Minimize2,
  Loader2,
  Pause,
  PictureInPicture2,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"
import type { VideoItem } from "@/types/video"
import { downloadMp4 } from "@/lib/videos/offline"
import {
  bumpViewCount,
  getLocalPlaybackUrl,
  updatePlaybackProgress,
} from "@/lib/videos/local-catalog"
import {
  effectiveWatchLimitMinutes,
  getAdvancedSettings,
} from "@/lib/videos/advanced-settings"
import { isCapacitorNativeShell } from "@/lib/device"
import { useTranslation } from "@/hooks/use-translation"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false })

const VOLUME_STORAGE_KEY = "fami-video-player-volume"

type UniversalVideoPlayerProps = {
  video: VideoItem
  className?: string
  onClose?: () => void
  onDownloaded?: (localUri: string) => void
  onCatalogChange?: () => void
  /** Fired when playback reaches the end (for series autoplay). */
  onEnded?: () => void
}

function toPlayableLocalUrl(localPath: string): string {
  const trimmed = localPath.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith("blob:") || trimmed.startsWith("http")) return trimmed
  try {
    return Capacitor.convertFileSrc(trimmed)
  } catch {
    return trimmed
  }
}

function formatMmSs(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/** Finite VOD duration only — never treat NaN/Infinity/resume position as length. */
function readFiniteDuration(el: HTMLVideoElement | null | undefined): number | null {
  if (!el) return null
  const d = el.duration
  if (typeof d !== "number" || !Number.isFinite(d) || d <= 0) return null
  return d
}

function normalizeKnownDuration(seconds: number | null | undefined): number {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return 0
  return seconds
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

function supportsPictureInPicture(): boolean {
  if (typeof document === "undefined") return false
  return Boolean(
    document.pictureInPictureEnabled &&
      typeof HTMLVideoElement !== "undefined" &&
      HTMLVideoElement.prototype.requestPictureInPicture,
  )
}

function countCaptionTracks(el: HTMLVideoElement | null): number {
  if (!el?.textTracks) return 0
  let n = 0
  for (let i = 0; i < el.textTracks.length; i++) {
    const kind = el.textTracks[i]?.kind
    if (kind === "subtitles" || kind === "captions") n++
  }
  return n
}

function setCaptionTracksMode(el: HTMLVideoElement | null, show: boolean) {
  if (!el?.textTracks) return
  for (let i = 0; i < el.textTracks.length; i++) {
    const track = el.textTracks[i]
    if (!track) continue
    if (track.kind !== "subtitles" && track.kind !== "captions") continue
    track.mode = show ? "showing" : "hidden"
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

function readStoredVolume(): number {
  if (typeof window === "undefined") return 0.85
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY)
    if (raw == null) return 0.85
    const n = Number(raw)
    if (!Number.isFinite(n)) return 0.85
    return Math.min(1, Math.max(0, n))
  } catch {
    return 0.85
  }
}

function persistStoredVolume(volume: number) {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume))
  } catch {
    /* ignore */
  }
}

/** play() rejects with AbortError when pause()/load/src wins the race — never leave unhandled. */
function isBenignMediaPlayError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const name = "name" in error ? String((error as { name: unknown }).name) : ""
  return name === "AbortError" || name === "NotAllowedError"
}

function swallowPlayRejection(error: unknown) {
  if (isBenignMediaPlayError(error)) return
  /* Other play() failures (decode, network) — ignore for custom controls UX. */
}

type BrowserVideoProps = {
  src: string
  startAt: number
  /** Catalog hint only — never confuse with resume position. */
  knownDurationSec?: number | null
  limitReached: boolean
  watchLimitSec: number | null
  preferCaptions?: boolean
  onBeginSession: () => void
  onPersist: (positionSec: number, addWatched: number) => void
  onLimitHit: () => void
  onEnded?: () => void
  watchedAccumRef: React.MutableRefObject<number>
}

function BrowserInlineVideo({
  src,
  startAt,
  knownDurationSec,
  limitReached,
  watchLimitSec,
  preferCaptions = false,
  onBeginSession,
  onPersist,
  onLimitHit,
  onEnded,
  watchedAccumRef,
}: BrowserVideoProps) {
  const { translate } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const resumeApplied = useRef(false)
  const lastTick = useRef<number | null>(null)
  const volumeBeforeMute = useRef(0.85)
  /** Invalidates in-flight play() when pause / src change / unmount wins. */
  const playGenerationRef = useRef(0)
  const playInFlightRef = useRef<Promise<void> | null>(null)

  const catalogDuration = normalizeKnownDuration(knownDurationSec)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(catalogDuration)
  const [volume, setVolume] = useState(0.85)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPip, setIsPip] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(preferCaptions)
  const [captionTrackCount, setCaptionTrackCount] = useState(0)
  const [pipSupported, setPipSupported] = useState(false)
  const captionsPreferApplied = useRef(false)

  const showContinue = startAt > 5 && !limitReached

  /** dynamic(react-player) may not always attach ref — fall back to DOM. */
  const getVideoEl = useCallback((): HTMLVideoElement | null => {
    if (videoRef.current) return videoRef.current
    const nested = shellRef.current?.querySelector("video")
    return nested instanceof HTMLVideoElement ? nested : null
  }, [])

  const applyMediaDuration = useCallback((raw: number | null | undefined) => {
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return null
    setDuration((prev) => (Math.abs(prev - raw) < 0.05 ? prev : raw))
    return raw
  }, [])

  const syncDurationFromMedia = useCallback(() => {
    return applyMediaDuration(readFiniteDuration(getVideoEl()))
  }, [applyMediaDuration, getVideoEl])

  const syncCaptionTracks = useCallback(() => {
    const el = getVideoEl()
    const count = countCaptionTracks(el)
    setCaptionTrackCount(count)
    if (count === 0) {
      setCaptionsOn(false)
      return
    }
    if (preferCaptions && !captionsPreferApplied.current) {
      captionsPreferApplied.current = true
      setCaptionsOn(true)
      setCaptionTracksMode(el, true)
      return
    }
    setCaptionTracksMode(el, captionsOn)
  }, [captionsOn, getVideoEl, preferCaptions])

  useEffect(() => {
    const initial = readStoredVolume()
    setVolume(initial)
    volumeBeforeMute.current = initial > 0 ? initial : 0.85
    setMuted(initial <= 0)
    setPipSupported(supportsPictureInPicture())
  }, [])

  const applyResume = useCallback(() => {
    const el = getVideoEl()
    if (!el || resumeApplied.current || startAt <= 0) return
    try {
      const mediaDur = readFiniteDuration(el)
      const max =
        mediaDur != null
          ? Math.max(0, mediaDur - 0.25)
          : catalogDuration > 0
            ? Math.max(0, catalogDuration - 0.25)
            : startAt
      const next = Math.min(startAt, max)
      el.currentTime = next
      setCurrentTime(next)
      resumeApplied.current = true
    } catch {
      /* ignore */
    }
  }, [catalogDuration, getVideoEl, startAt])

  /**
   * Imperative play only — do not also pass `playing` to ReactPlayer (v3 calls
   * video.play() without .catch(), which surfaces AbortError on pause races).
   */
  const safePlay = useCallback(async (): Promise<boolean> => {
    const el = getVideoEl()
    if (!el || limitReached) return false
    const generation = ++playGenerationRef.current
    setPlaying(true)
    onBeginSession()
    lastTick.current = Date.now()
    const playPromise = el
      .play()
      .then(() => undefined)
      .catch((error: unknown) => {
        swallowPlayRejection(error)
      })
    playInFlightRef.current = playPromise
    await playPromise
    if (playInFlightRef.current === playPromise) {
      playInFlightRef.current = null
    }
    if (playGenerationRef.current !== generation) return false
    if (el.paused) {
      setPlaying(false)
      lastTick.current = null
      return false
    }
    return true
  }, [getVideoEl, limitReached, onBeginSession])

  const safePause = useCallback(async () => {
    const generation = ++playGenerationRef.current
    const inflight = playInFlightRef.current
    if (inflight) {
      try {
        await inflight
      } catch {
        /* handled in safePlay */
      }
    }
    if (playGenerationRef.current !== generation) return
    getVideoEl()?.pause()
    setPlaying(false)
    lastTick.current = null
  }, [getVideoEl])

  /**
   * Reset only when the media source changes — NOT when startAt / catalogDuration
   * update from progress persist + catalog refresh (that was pausing every ~1s).
   */
  useEffect(() => {
    playGenerationRef.current += 1
    playInFlightRef.current = null
    const el = getVideoEl()
    el?.pause()
    resumeApplied.current = false
    setPlaying(false)
    setCurrentTime(0)
    setDuration(catalogDuration)
    setSpeedMenuOpen(false)
    setCaptionsOn(false)
    setCaptionTrackCount(0)
    lastTick.current = null
    // catalogDuration / startAt intentionally omitted — session resume is frozen by parent
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on src identity
  }, [src, getVideoEl])

  /** Soft-update catalog duration hint without interrupting playback. */
  useEffect(() => {
    if (catalogDuration <= 0) return
    setDuration((prev) => (prev > 0 ? prev : catalogDuration))
  }, [catalogDuration])

  useEffect(() => {
    const onFsChange = () => {
      const el = shellRef.current
      setIsFullscreen(Boolean(el && document.fullscreenElement === el))
    }
    const onPipChange = () => {
      setIsPip(Boolean(document.pictureInPictureElement))
    }
    document.addEventListener("fullscreenchange", onFsChange)
    document.addEventListener("enterpictureinpicture", onPipChange)
    document.addEventListener("leavepictureinpicture", onPipChange)
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange)
      document.removeEventListener("enterpictureinpicture", onPipChange)
      document.removeEventListener("leavepictureinpicture", onPipChange)
    }
  }, [])

  useEffect(() => {
    return () => {
      playGenerationRef.current += 1
      playInFlightRef.current = null
      const nested = shellRef.current?.querySelector("video")
      const el = videoRef.current ?? (nested instanceof HTMLVideoElement ? nested : null)
      try {
        el?.pause()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const handleContinue = () => {
    const el = getVideoEl()
    if (!el) return
    const mediaDur = readFiniteDuration(el)
    const max =
      mediaDur != null
        ? Math.max(0, mediaDur - 0.25)
        : catalogDuration > 0
          ? Math.max(0, catalogDuration - 0.25)
          : startAt
    const next = Math.min(startAt, max)
    try {
      el.currentTime = next
    } catch {
      /* ignore seek race during load */
    }
    resumeApplied.current = true
    setCurrentTime(next)
    void safePlay()
  }

  const togglePlay = () => {
    const el = getVideoEl()
    if (!el || limitReached) return
    if (el.paused) {
      if (!resumeApplied.current && startAt > 0 && showContinue) {
        handleContinue()
        return
      }
      void safePlay()
    } else {
      void safePause()
    }
  }

  const seekCeiling = (): number => {
    const mediaDur = readFiniteDuration(getVideoEl())
    if (mediaDur != null) return mediaDur
    if (duration > 0) return duration
    if (catalogDuration > 0) return catalogDuration
    return Number.POSITIVE_INFINITY
  }

  const seekTo = (seconds: number) => {
    const el = getVideoEl()
    if (!el) return
    const max = seekCeiling()
    const next =
      Number.isFinite(max) && max > 0
        ? Math.min(Math.max(0, seconds), max)
        : Math.max(0, seconds)
    try {
      el.currentTime = next
      setCurrentTime(next)
      resumeApplied.current = true
      onPersist(next, 0)
    } catch {
      /* ignore */
    }
  }

  const setVolumeLevel = (next: number) => {
    const clamped = Math.min(1, Math.max(0, next))
    setVolume(clamped)
    persistStoredVolume(clamped)
    if (clamped > 0) {
      volumeBeforeMute.current = clamped
      setMuted(false)
    } else {
      setMuted(true)
    }
  }

  const toggleMute = () => {
    if (muted || volume <= 0) {
      const restore = volumeBeforeMute.current > 0 ? volumeBeforeMute.current : 0.85
      setVolumeLevel(restore)
      return
    }
    volumeBeforeMute.current = volume
    setMuted(true)
  }

  const toggleFullscreen = async () => {
    const el = shellRef.current
    if (!el) return
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen()
      } else if (el.requestFullscreen) {
        await el.requestFullscreen()
      }
    } catch {
      /* ignore — some WebViews block fullscreen */
    }
  }

  const togglePip = async () => {
    const el = getVideoEl()
    if (!el || !pipSupported) return
    try {
      if (document.pictureInPictureElement === el) {
        await document.exitPictureInPicture()
      } else {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture()
        }
        await el.requestPictureInPicture()
      }
    } catch {
      /* ignore — WebView / permission */
    }
  }

  const toggleCaptions = () => {
    const el = getVideoEl()
    if (!el || captionTrackCount <= 0) return
    const next = !captionsOn
    setCaptionsOn(next)
    setCaptionTracksMode(el, next)
  }

  const chooseSpeed = (rate: number) => {
    setPlaybackRate(rate)
    setSpeedMenuOpen(false)
    const el = getVideoEl()
    if (el) {
      try {
        el.playbackRate = rate
      } catch {
        /* ignore */
      }
    }
  }

  const effectiveVolume = muted ? 0 : volume
  const seekMax = duration > 0 ? duration : catalogDuration > 0 ? catalogDuration : 1
  const durationLabel =
    duration > 0 || catalogDuration > 0 ? formatMmSs(duration || catalogDuration) : "--:--"
  const positionLabel = formatMmSs(currentTime)
  /** Overlay only seek + primary row — secondary toolbar sits below the video. */
  const chromeBottomPad = "bottom-[3.25rem] sm:bottom-[3.5rem]"
  const overlayBtn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/20 sm:h-10 sm:w-10"
  const barBtn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-foreground hover:bg-muted"
  const overlayIcon = "h-4 w-4"
  const barIcon = "h-3.5 w-3.5"

  return (
    <div className="@container/player space-y-2">
      {showContinue ? (
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full gap-2 rounded-xl border-primary/25 bg-primary/10 text-foreground hover:bg-primary/15"
          onClick={handleContinue}
        >
          <Play className="h-4 w-4 fill-current" />
          {tv(translate, "pageVideos.continueWatching", "Weiterschauen")}
          <span className="text-muted-foreground">
            ·{" "}
            {tv(translate, "pageVideos.resumeHint", `Weiter bei ${formatMmSs(startAt)}`, {
              time: formatMmSs(startAt),
            })}
          </span>
        </Button>
      ) : null}

      <div
        ref={shellRef}
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-border/40 sm:rounded-2xl"
      >
        <ReactPlayer
          ref={videoRef}
          src={src}
          controls={false}
          volume={effectiveVolume}
          muted={muted || effectiveVolume <= 0}
          playbackRate={playbackRate}
          width="100%"
          height="100%"
          playsInline
          style={{ width: "100%", height: "100%" }}
          onReady={() => {
            syncDurationFromMedia()
            syncCaptionTracks()
            if (!showContinue) applyResume()
          }}
          onLoadedMetadata={(e) => {
            applyMediaDuration(e.currentTarget.duration)
            syncCaptionTracks()
            if (!showContinue) applyResume()
          }}
          onDurationChange={(e) => {
            applyMediaDuration(e.currentTarget.duration)
          }}
          onPlay={() => {
            onBeginSession()
            lastTick.current = Date.now()
            setPlaying(true)
          }}
          onPause={() => {
            lastTick.current = null
            setPlaying(false)
          }}
          onEnded={() => {
            playGenerationRef.current += 1
            setPlaying(false)
            lastTick.current = null
            onEnded?.()
          }}
          onTimeUpdate={(e) => {
            const pos = e.currentTarget.currentTime
            if (typeof pos !== "number" || !Number.isFinite(pos)) return
            if (!scrubbing) setCurrentTime(pos)
            // Always prefer real media duration over catalog hint (hint may be wrong).
            applyMediaDuration(e.currentTarget.duration)
            const now = Date.now()
            let add = 0
            if (lastTick.current != null) {
              add = (now - lastTick.current) / 1000
            }
            lastTick.current = now
            if (add > 0 || Math.floor(pos) % 5 === 0) {
              onPersist(pos, add > 2 ? 0 : add)
            }
            if (watchLimitSec != null && watchedAccumRef.current >= watchLimitSec) {
              if (!e.currentTarget.paused) {
                playGenerationRef.current += 1
                playInFlightRef.current = null
                e.currentTarget.pause()
                setPlaying(false)
                lastTick.current = null
              }
              onLimitHit()
            }
          }}
        />

        {/* Tap target above chrome — does not cover control rows */}
        <button
          type="button"
          className={cn(
            "absolute inset-x-0 top-0 z-[1] flex items-center justify-center bg-transparent",
            chromeBottomPad,
          )}
          aria-label={
            playing
              ? tv(translate, "pageVideos.pauseAria", "Pause")
              : tv(translate, "pageVideos.playAria", "Abspielen")
          }
          disabled={limitReached}
          onClick={(e) => {
            e.stopPropagation()
            setSpeedMenuOpen(false)
            togglePlay()
          }}
        >
          {!playing ? (
            <span className="pointer-events-none flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/20 sm:h-12 sm:w-12">
              <Play className="h-7 w-7 translate-x-0.5 fill-current sm:h-6 sm:w-6" />
            </span>
          ) : null}
        </button>

        {/* Compact overlay: seek + primary transport only */}
        <div
          className="absolute inset-x-0 bottom-0 z-[2] space-y-0.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pb-1 pt-5 sm:px-3 sm:pb-1.5 sm:pt-6"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="px-0.5">
            <Slider
              min={0}
              max={seekMax}
              step={0.1}
              value={[Math.min(currentTime, seekMax)]}
              aria-label={tv(translate, "pageVideos.seekAria", "Wiedergabeposition")}
              className="h-5 w-full sm:h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-thumb]]:size-3.5 sm:[&_[data-slot=slider-thumb]]:size-4"
              onValueChange={(vals) => {
                const next = vals[0] ?? 0
                setScrubbing(true)
                setCurrentTime(next)
              }}
              onValueCommit={(vals) => {
                const next = vals[0] ?? 0
                setScrubbing(false)
                seekTo(next)
              }}
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(overlayBtn, "bg-white/10")}
              aria-label={
                playing
                  ? tv(translate, "pageVideos.pauseAria", "Pause")
                  : tv(translate, "pageVideos.playAria", "Abspielen")
              }
              disabled={limitReached}
              onClick={(e) => {
                e.stopPropagation()
                togglePlay()
              }}
            >
              {playing ? (
                <Pause className={cn(overlayIcon, "fill-current")} />
              ) : (
                <Play className={cn(overlayIcon, "fill-current")} />
              )}
            </button>

            <span
              className="min-w-0 shrink truncate text-[11px] font-medium tabular-nums text-white/90 sm:text-xs"
              data-testid="video-time-display"
            >
              {positionLabel}
              <span className="text-white/50"> / {durationLabel}</span>
            </span>

            <div className="ml-auto flex min-w-0 items-center gap-1">
              <button
                type="button"
                className={cn(overlayBtn, "bg-white/10")}
                aria-label={
                  muted || volume <= 0
                    ? tv(translate, "pageVideos.unmuteAria", "Ton an")
                    : tv(translate, "pageVideos.muteAria", "Stumm")
                }
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMute()
                }}
              >
                {muted || volume <= 0 ? (
                  <VolumeX className={overlayIcon} />
                ) : (
                  <Volume2 className={overlayIcon} />
                )}
              </button>

              <button
                type="button"
                className={cn(overlayBtn, "bg-white/10")}
                aria-label={
                  isFullscreen
                    ? tv(translate, "pageVideos.exitFullscreenAria", "Vollbild beenden")
                    : tv(translate, "pageVideos.fullscreenAria", "Vollbild")
                }
                onClick={(e) => {
                  e.stopPropagation()
                  void toggleFullscreen()
                }}
              >
                {isFullscreen ? (
                  <Minimize2 className={overlayIcon} />
                ) : (
                  <Maximize2 className={overlayIcon} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary bar below video — speed / captions / pip / volume (not crowding seek) */}
      <div className="relative flex items-center gap-1.5">
        <div className="relative">
          <button
            type="button"
            className={cn(
              barBtn,
              "min-w-[2.5rem] gap-0.5 px-1.5 text-[11px] font-semibold tabular-nums",
              speedMenuOpen && "border-primary/40 bg-primary/10",
            )}
            aria-label={tv(translate, "pageVideos.speedAria", "Abspielgeschwindigkeit")}
            aria-expanded={speedMenuOpen}
            aria-haspopup="listbox"
            onClick={(e) => {
              e.stopPropagation()
              setSpeedMenuOpen((open) => !open)
            }}
          >
            <Gauge className={cn(barIcon, "opacity-90")} />
            {playbackRate === 1 ? "1×" : `${playbackRate}×`}
          </button>
          {speedMenuOpen ? (
            <ul
              role="listbox"
              aria-label={tv(translate, "pageVideos.speedAria", "Abspielgeschwindigkeit")}
              className="absolute bottom-full left-0 z-[3] mb-1.5 min-w-[5rem] overflow-hidden rounded-xl border border-border/70 bg-card py-1 shadow-lg"
            >
              {PLAYBACK_RATES.map((rate) => (
                <li key={rate}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={playbackRate === rate}
                    className={cn(
                      "flex min-h-10 w-full items-center px-3 py-2 text-left text-sm tabular-nums text-foreground hover:bg-muted",
                      playbackRate === rate && "bg-primary/15 font-semibold",
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      chooseSpeed(rate)
                    }}
                  >
                    {rate === 1 ? "1×" : `${rate}×`}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          className={cn(
            barBtn,
            captionsOn && "border-primary/40 bg-primary/15 text-primary",
            captionTrackCount <= 0 && "opacity-45",
          )}
          disabled={captionTrackCount <= 0}
          aria-pressed={captionsOn}
          aria-label={
            captionTrackCount <= 0
              ? tv(translate, "pageVideos.captionsUnavailableAria", "Keine Untertitel verfügbar")
              : captionsOn
                ? tv(translate, "pageVideos.captionsOnAria", "Untertitel aus")
                : tv(translate, "pageVideos.captionsOffAria", "Untertitel an")
          }
          onClick={(e) => {
            e.stopPropagation()
            toggleCaptions()
          }}
        >
          <Captions className={barIcon} />
        </button>

        <button
          type="button"
          className={cn(
            barBtn,
            isPip && "border-primary/40 bg-primary/15 text-primary",
            !pipSupported && "opacity-45",
          )}
          disabled={!pipSupported}
          aria-pressed={isPip}
          aria-label={
            !pipSupported
              ? tv(translate, "pageVideos.pipUnsupportedAria", "Fenster im Fenster nicht verfügbar")
              : isPip
                ? tv(translate, "pageVideos.exitPipAria", "Fenster im Fenster beenden")
                : tv(translate, "pageVideos.pipAria", "Fenster im Fenster")
          }
          onClick={(e) => {
            e.stopPropagation()
            void togglePip()
          }}
        >
          <PictureInPicture2 className={barIcon} />
        </button>

        <div className="ml-auto flex w-[7.5rem] shrink-0 items-center gap-1.5 sm:w-40">
          <Slider
            min={0}
            max={100}
            step={1}
            value={[Math.round(effectiveVolume * 100)]}
            aria-label={tv(translate, "pageVideos.volumeAria", "Lautstärke")}
            className="h-7 min-w-0 flex-1 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-thumb]]:size-3.5"
            onValueChange={(vals) => {
              setVolumeLevel((vals[0] ?? 0) / 100)
            }}
          />
          <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
            {Math.round(effectiveVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function PlayerChrome({
  video,
  onClose,
}: {
  video: VideoItem
  onClose?: () => void
}) {
  const { translate } = useTranslation()
  const duration = formatMmSs(video.durationSeconds ?? 0)
  const hasDuration = typeof video.durationSeconds === "number" && video.durationSeconds > 0

  return (
    <div className="flex items-start gap-3 border-b border-border/60 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base">
          {video.title}
        </h2>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground sm:mt-1">
          {hasDuration ? (
            <span>
              {tv(translate, "pageVideos.durationLabel", `Dauer ${duration}`, { time: duration })}
            </span>
          ) : null}
          {(video.lastPositionSeconds ?? 0) > 5 ? (
            <span className="font-medium text-primary">
              {tv(translate, "pageVideos.continueWatching", "Weiterschauen")}
            </span>
          ) : null}
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground sm:h-10 sm:w-10"
          aria-label={translate("common.close")}
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  )
}

export function UniversalVideoPlayer({
  video,
  className,
  onClose,
  onDownloaded,
  onCatalogChange,
  onEnded,
}: UniversalVideoPlayerProps) {
  const { translate } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [downloadedPath, setDownloadedPath] = useState<string | undefined>(video.localOfflinePath)
  const [browserBlobUrl, setBrowserBlobUrl] = useState<string | null>(null)
  const [nativeStreamUrl, setNativeStreamUrl] = useState<string | null>(null)
  const [defaultWatchLimitMinutes, setDefaultWatchLimitMinutes] = useState<number | null>(null)
  const [preferCaptions, setPreferCaptions] = useState(false)
  const sessionStarted = useRef(false)
  const watchedAccum = useRef(video.totalWatchedSeconds ?? 0)
  const lastTick = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void getAdvancedSettings().then((s) => {
      if (cancelled) return
      setDefaultWatchLimitMinutes(s.defaultWatchLimitMinutes)
      setPreferCaptions(s.showCaptionsWhenAvailable)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const isLocalSource = video.source === "local"
  const hasLocalFile = Boolean(
    video.isDownloaded ||
      video.downloadStatus === "done" ||
      downloadedPath ||
      (isLocalSource && video.localOfflinePath),
  )
  const isYoutubeOrigin = Boolean(video.sourceUrl) || video.type === "youtube"
  const downloadPending =
    isYoutubeOrigin &&
    !hasLocalFile &&
    (video.downloadStatus === "queued" ||
      video.downloadStatus === "downloading" ||
      video.downloadStatus === "idle")
  const downloadFailed =
    video.downloadStatus === "error" || video.downloadStatus === "native_only"
  const canDownloadCloudMp4 = video.type === "mp4" && !isLocalSource && !hasLocalFile && !isYoutubeOrigin

  const effectiveLimitMin = effectiveWatchLimitMinutes(video.watchLimitMinutes, {
    defaultWatchLimitMinutes,
  })
  const watchLimitSec =
    typeof effectiveLimitMin === "number" && effectiveLimitMin > 0
      ? effectiveLimitMin * 60
      : null

  /**
   * Freeze resume position for this open session. Catalog refresh from
   * updatePlaybackProgress must not change startAt (BrowserInlineVideo would reset).
   */
  const [sessionStartAt, setSessionStartAt] = useState(() =>
    Math.max(0, Math.floor(video.lastPositionSeconds ?? 0)),
  )

  useEffect(() => {
    setDownloadedPath(video.localOfflinePath)
    watchedAccum.current = video.totalWatchedSeconds ?? 0
    sessionStarted.current = false
    lastTick.current = null
    setSessionStartAt(Math.max(0, Math.floor(video.lastPositionSeconds ?? 0)))
    setLimitReached(watchLimitSec != null && (video.totalWatchedSeconds ?? 0) >= watchLimitSec)
  }, [video.id])

  useEffect(() => {
    setDownloadedPath(video.localOfflinePath)
  }, [video.localOfflinePath])

  useEffect(() => {
    if (watchLimitSec != null && (video.totalWatchedSeconds ?? 0) >= watchLimitSec) {
      setLimitReached(true)
    }
  }, [video.totalWatchedSeconds, watchLimitSec])

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    if (hasLocalFile && !isCapacitorNativeShell()) {
      void (async () => {
        const url = await getLocalPlaybackUrl(video.id)
        if (!cancelled && url?.startsWith("blob:")) {
          revoked = url
          setBrowserBlobUrl(url)
        }
      })()
    } else {
      setBrowserBlobUrl(null)
    }
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [hasLocalFile, video.id])

  useEffect(() => {
    let cancelled = false
    if (hasLocalFile && isCapacitorNativeShell()) {
      void (async () => {
        const url = await getLocalPlaybackUrl(video.id)
        if (!cancelled && url) setNativeStreamUrl(toPlayableLocalUrl(url))
      })()
    } else {
      setNativeStreamUrl(null)
    }
    return () => {
      cancelled = true
    }
  }, [hasLocalFile, video.id])

  const persistProgress = useCallback(
    async (positionSec: number, addWatched = 0) => {
      if (video.source !== "local") return
      watchedAccum.current += Math.max(0, addWatched)
      await updatePlaybackProgress(video.id, positionSec, watchedAccum.current)
      onCatalogChange?.()
      if (watchLimitSec != null && watchedAccum.current >= watchLimitSec) {
        setLimitReached(true)
      }
    },
    [onCatalogChange, video.id, video.source, watchLimitSec],
  )

  const beginSession = useCallback(async () => {
    if (sessionStarted.current || video.source !== "local") return
    sessionStarted.current = true
    await bumpViewCount(video.id)
    onCatalogChange?.()
  }, [onCatalogChange, video.id, video.source])

  const playOfflineFullscreen = useCallback(async () => {
    setLocalError(null)
    if (limitReached) {
      setLocalError(translate("pageVideos.watchLimitReached"))
      return
    }
    if (!isCapacitorNativeShell()) {
      setLocalError(translate("pageVideos.offlineNativeOnly"))
      return
    }
    setBusy(true)
    try {
      await beginSession()
      const resolved =
        (await getLocalPlaybackUrl(video.id)) || downloadedPath || video.localOfflinePath
      if (!resolved) {
        setLocalError(translate("pageVideos.offlineMissing"))
        return
      }
      const url = toPlayableLocalUrl(resolved)
      await CapacitorVideoPlayer.initPlayer({
        mode: "fullscreen",
        url,
        playerId: `fami-video-${video.id}`,
        componentTag: "div",
        exitOnEnd: true,
        showControls: true,
      })
      if (sessionStartAt > 0) {
        await persistProgress(sessionStartAt, 0)
      }
    } catch (e) {
      console.error("[UniversalVideoPlayer] initPlayer failed:", e)
      setLocalError(translate("pageVideos.offlinePlayError"))
    } finally {
      setBusy(false)
    }
  }, [
    beginSession,
    downloadedPath,
    limitReached,
    persistProgress,
    sessionStartAt,
    translate,
    video.id,
    video.localOfflinePath,
  ])

  const handleDownload = useCallback(async () => {
    if (!canDownloadCloudMp4) return
    setLocalError(null)
    setBusy(true)
    try {
      const result = await downloadMp4(video.url, video.id)
      if (!result.ok) {
        setLocalError(translate("pageVideos.downloadError"))
        return
      }
      setDownloadedPath(result.uri)
      onDownloaded?.(result.uri)
    } finally {
      setBusy(false)
    }
  }, [canDownloadCloudMp4, onDownloaded, translate, video.id, video.url])

  const bodyPadding = "px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3"

  if (downloadPending) {
    const pct = Math.round(video.downloadProgress ?? 0)
    return (
      <div className={cn("w-full", className)}>
        <PlayerChrome video={video} onClose={onClose} />
        <div className={cn(bodyPadding, "space-y-3")}>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {translate("pageVideos.downloadingOffline")}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{pct}%</p>
        </div>
      </div>
    )
  }

  if (downloadFailed && isYoutubeOrigin && !hasLocalFile) {
    return (
      <div className={cn("w-full", className)}>
        <PlayerChrome video={video} onClose={onClose} />
        <div className={cn(bodyPadding, "space-y-2")}>
          <p className="text-sm text-destructive">
            {video.downloadError === "browser_server_offline"
              ? translate("compAdminVideos.downloadBrowserServerOffline")
              : video.downloadStatus === "native_only"
                ? translate("pageVideos.downloadNativeOnly")
                : translate("pageVideos.downloadOfflineError")}
          </p>
          {video.downloadError ? (
            <p className="break-all text-xs text-muted-foreground">{video.downloadError}</p>
          ) : null}
        </div>
      </div>
    )
  }

  if (hasLocalFile) {
    const inlineUrl =
      browserBlobUrl ||
      nativeStreamUrl ||
      (video.url && video.url.startsWith("http") ? video.url : undefined)

    return (
      <div className={cn("w-full", className)}>
        <PlayerChrome video={video} onClose={onClose} />
        <div className={cn(bodyPadding, "space-y-3")}>
          {limitReached ? (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {translate("pageVideos.watchLimitReached")}
            </p>
          ) : null}

          {inlineUrl && !limitReached ? (
            <BrowserInlineVideo
              key={video.id}
              src={inlineUrl}
              startAt={sessionStartAt}
              knownDurationSec={video.durationSeconds}
              limitReached={limitReached}
              watchLimitSec={watchLimitSec}
              preferCaptions={preferCaptions}
              onBeginSession={() => void beginSession()}
              onPersist={(pos, add) => void persistProgress(pos, add)}
              onLimitHit={() => setLimitReached(true)}
              onEnded={onEnded}
              watchedAccumRef={watchedAccum}
            />
          ) : !limitReached ? (
            <p className="text-sm text-muted-foreground">{translate("pageVideos.offlineMissing")}</p>
          ) : null}

          {isCapacitorNativeShell() && !limitReached ? (
            <Button
              type="button"
              variant="secondary"
              className="touch-target-min w-full gap-2 rounded-xl"
              disabled={busy}
              onClick={() => void playOfflineFullscreen()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              {translate("pageVideos.watchOfflineFullscreen")}
            </Button>
          ) : null}

          {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
        </div>
      </div>
    )
  }

  const streamUrl =
    !isYoutubeOrigin && video.type === "mp4" && video.url && !video.url.startsWith("idb:")
      ? video.url
      : browserBlobUrl || undefined

  return (
    <div className={cn("w-full", className)}>
      <PlayerChrome video={video} onClose={onClose} />
      <div className={cn(bodyPadding, "space-y-3")}>
        {streamUrl && !limitReached ? (
          <BrowserInlineVideo
            key={video.id}
            src={streamUrl}
            startAt={sessionStartAt}
            knownDurationSec={video.durationSeconds}
            limitReached={limitReached}
            watchLimitSec={watchLimitSec}
            preferCaptions={preferCaptions}
            onBeginSession={() => void beginSession()}
            onPersist={(pos, add) => void persistProgress(pos, add)}
            onLimitHit={() => setLimitReached(true)}
            onEnded={onEnded}
            watchedAccumRef={watchedAccum}
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-black p-4 text-center text-sm text-muted-foreground ring-1 ring-border/40">
            {isYoutubeOrigin
              ? translate("pageVideos.downloadNativeOnly")
              : translate("pageVideos.offlineMissing")}
          </div>
        )}
        {canDownloadCloudMp4 ? (
          <Button
            type="button"
            variant="secondary"
            className="touch-target-min w-full gap-2 rounded-xl"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              void handleDownload()
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {translate("pageVideos.download")}
          </Button>
        ) : null}
        {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
      </div>
    </div>
  )
}
