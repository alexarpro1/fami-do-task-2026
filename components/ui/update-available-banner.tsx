"use client"

import { useEffect, useState } from "react"
import { APP_VERSION } from "@/lib/version"
import { Button } from "@/components/ui/button"
import { MANUAL_UPDATE_CHECK_EVENT } from "@/lib/sync-v2/version-client"
import type { UpdateInfo } from "@/lib/sync-v2/version-client"
import { useAppUpdate } from "@/hooks/useAppUpdate"
import { X, Download, ExternalLink } from "lucide-react"

const DISMISS_KEY = "famiapp-update-banner-dismissed"

export function UpdateAvailableBanner() {
  const { updateAvailable, label, latestVersion, openDownload, loading, forceUpdate } =
    useAppUpdate()
  const [dismissed, setDismissed] = useState(false)
  const [eventLabel, setEventLabel] = useState<string | null>(null)

  useEffect(() => {
    const dismissedBuild =
      typeof window !== "undefined" ? localStorage.getItem(DISMISS_KEY) : null
    if (dismissedBuild) {
      try {
        const build = parseInt(dismissedBuild, 10)
        if (build >= APP_VERSION.build) setDismissed(true)
      } catch (_) {}
    }
  }, [])

  useEffect(() => {
    const onManualCheck = (e: Event) => {
      const detail = (e as CustomEvent<UpdateInfo>).detail
      if (detail?.available) {
        setEventLabel(detail.label || null)
        setDismissed(false)
      }
    }
    window.addEventListener(MANUAL_UPDATE_CHECK_EVENT, onManualCheck)
    return () => window.removeEventListener(MANUAL_UPDATE_CHECK_EVENT, onManualCheck)
  }, [])

  useEffect(() => {
    if (updateAvailable) setDismissed(false)
  }, [updateAvailable, latestVersion])

  if (loading || forceUpdate || !updateAvailable || dismissed) return null

  const displayLabel =
    eventLabel || label || (latestVersion ? `V${latestVersion.replace(/^V/i, "")}` : "Update")

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, String(APP_VERSION.build))
    }
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/15 text-primary border-b border-primary/20"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Download className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium truncate">Update verfügbar: {displayLabel}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          className="min-h-[44px] h-11 gap-1.5"
          onClick={() => void openDownload()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Aktualisieren
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] h-11 w-11 shrink-0"
          onClick={handleDismiss}
          aria-label="Hinweis schliessen"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
