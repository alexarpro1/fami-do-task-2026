"use client"

import { useEffect, useState } from "react"
import { APP_VERSION } from "@/lib/version"
import { Button } from "@/components/ui/button"
import { getUpdateInfo } from "@/lib/sync-v2/version-client"
import { getUpdateCheckAdapter } from "@/lib/sync-v2/adapters"
import { X, Download, ExternalLink } from "lucide-react"

const DISMISS_KEY = "famiapp-update-banner-dismissed"

export function UpdateAvailableBanner() {
  const [updateInfo, setUpdateInfo] = useState<{
    available: boolean
    label: string
    updateUrl: string | null
  } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dismissedBuild = typeof window !== "undefined" ? localStorage.getItem(DISMISS_KEY) : null
    if (dismissedBuild) {
      try {
        const build = parseInt(dismissedBuild, 10)
        if (build >= APP_VERSION.build) setDismissed(true)
      } catch (_) {}
    }

    const adapter = getUpdateCheckAdapter()
    getUpdateInfo(adapter)
      .then((info) => {
        if (info.available) {
          setUpdateInfo({ available: true, label: info.label, updateUrl: info.updateUrl })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, String(APP_VERSION.build))
    }
  }

  if (loading || !updateInfo?.available || dismissed) return null

  const updateUrl = updateInfo.updateUrl || (typeof window !== "undefined" ? window.location.origin : "/")

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/15 text-primary border-b border-primary/20"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Download className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium truncate">
          Update verfügbar: {updateInfo.label}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5"
          asChild
        >
          <a
            href={updateUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Aktualisieren
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleDismiss}
          aria-label="Hinweis schließen"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
