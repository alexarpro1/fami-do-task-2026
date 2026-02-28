"use client"

import { useEffect, useState } from "react"
import { APP_VERSION } from "@/lib/version"
import { Button } from "@/components/ui/button"
import { getUpdateInfo, MANUAL_UPDATE_CHECK_EVENT } from "@/lib/sync-v2/version-client"
import type { UpdateInfo } from "@/lib/sync-v2/version-client"
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

  const applyUpdateInfo = (info: UpdateInfo) => {
    if (info.available) {
      setUpdateInfo({ available: true, label: info.label, updateUrl: info.updateUrl })
      setDismissed(false)
    }
  }

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

  useEffect(() => {
    const onManualCheck = (e: Event) => {
      const detail = (e as CustomEvent<UpdateInfo>).detail
      if (detail?.available) applyUpdateInfo(detail)
    }
    window.addEventListener(MANUAL_UPDATE_CHECK_EVENT, onManualCheck)
    return () => window.removeEventListener(MANUAL_UPDATE_CHECK_EVENT, onManualCheck)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, String(APP_VERSION.build))
    }
  }

  if (loading || !updateInfo?.available || dismissed) return null

  const updateUrl = updateInfo.updateUrl || (typeof window !== "undefined" ? window.location.origin : "/")

  const openUpdateUrl = async () => {
    try {
      const cap = (typeof window !== "undefined" && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor) as { isNativePlatform?: () => boolean } | undefined
      if (cap?.isNativePlatform?.()) {
        const { Browser } = await import("@capacitor/browser")
        await Browser.open({ url: updateUrl })
        return
      }
    } catch (_) {}
    window.open(updateUrl, "_blank", "noopener,noreferrer")
  }

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
          onClick={openUpdateUrl}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Aktualisieren
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
