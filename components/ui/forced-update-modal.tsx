"use client"

import { useAppUpdate } from "@/hooks/useAppUpdate"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function ForcedUpdateModal() {
  const { forceUpdate, latestVersion, downloadUrl, loading } = useAppUpdate()

  if (loading || !forceUpdate) return null

  const openDownloadUrl = async () => {
    const url = downloadUrl || (typeof window !== "undefined" ? window.location.origin : "/")
    try {
      const cap = typeof window !== "undefined" && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      if (cap?.isNativePlatform?.()) {
        const { Browser } = await import("@capacitor/browser")
        await Browser.open({ url })
        return
      }
    } catch (_) {}
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer")
  }

  const displayVersion = latestVersion ? (latestVersion.startsWith("V") ? latestVersion : `V${latestVersion}`) : ""

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="forced-update-title"
      aria-describedby="forced-update-desc"
    >
      <div className="flex max-w-sm flex-col items-center gap-6 rounded-2xl border-2 border-destructive/80 bg-card p-6 text-center shadow-xl">
        <h2 id="forced-update-title" className="text-lg font-semibold text-destructive">
          Update erforderlich
        </h2>
        <p id="forced-update-desc" className="text-sm text-muted-foreground">
          {displayVersion
            ? `Version ${displayVersion} ist erforderlich. Bitte aktualisiere die App, um fortzufahren.`
            : "Bitte aktualisiere die App, um fortzufahren."}
        </p>
        <Button
          onClick={openDownloadUrl}
          className="w-full gap-2 font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
          size="lg"
        >
          <Download className="h-5 w-5" />
          Jetzt herunterladen
        </Button>
      </div>
    </div>
  )
}
