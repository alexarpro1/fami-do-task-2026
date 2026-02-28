"use client"

import { useAppUpdate } from "@/hooks/useAppUpdate"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function ForcedUpdateModal() {
  const { updateAvailable, forceUpdate, latestVersion, downloadUrl, loading } = useAppUpdate()

  if (loading || !updateAvailable || !forceUpdate) return null

  const handleUpdate = () => {
    if (typeof window !== "undefined") window.open(downloadUrl, "_blank")
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
      <div className="flex max-w-sm flex-col items-center gap-6 rounded-2xl border border-primary/30 bg-card p-6 text-center shadow-xl">
        <h2 id="forced-update-title" className="text-lg font-semibold text-foreground">
          Neues Update verfügbar
        </h2>
        <p id="forced-update-desc" className="text-sm text-muted-foreground">
          {displayVersion
            ? `Version ${displayVersion} ist jetzt online. Bitte aktualisiere die App, damit alle auf dem gleichen Stand sind.`
            : "Bitte aktualisiere die App auf die neueste Version."}
        </p>
        <Button
          onClick={handleUpdate}
          className="w-full gap-2 font-semibold"
          size="lg"
        >
          <Download className="h-5 w-5" />
          Jetzt updaten
        </Button>
      </div>
    </div>
  )
}
