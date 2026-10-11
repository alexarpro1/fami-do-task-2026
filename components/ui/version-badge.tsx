"use client"

import { Info, Download, ExternalLink, RefreshCw, Sparkles, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { APP_VERSION, BUILD_INFO, APP_UPDATE_DOWNLOAD_URL, APP_DEVELOPER } from "@/lib/version"
import { useToast } from "@/hooks/use-toast"
import { useAppUpdate } from "@/hooks/useAppUpdate"
import { isNativeApp, saveIndividualDeviceInfo } from "@/lib/device"
import {
  getGithubReleasePageUrl,
  openSafeUpdateUrl,
  resolveSafeApkDownloadUrl,
} from "@/lib/update-security"

export interface CapacitorRuntimeInfo {
  appInfo: Record<string, unknown>
  deviceInfo: Record<string, unknown>
}

function formatCapacitorValue(v: unknown): string {
  if (v === undefined || v === null) return "—"
  if (typeof v === "boolean") return v ? "Ja" : "Nein"
  return String(v)
}

/** Capacitor-App- und Geraeteinfos (fuer Entwickler-Optionen). */
export function CapacitorInfoBlock() {
  const [info, setInfo] = useState<CapacitorRuntimeInfo | null>(null)
  useEffect(() => {
    if (typeof window === "undefined" || !isNativeApp()) return
    let cancelled = false
    Promise.all([
      import("@capacitor/app").then((m) => m.App.getInfo()),
      import("@capacitor/device").then((m) => m.Device.getInfo()),
    ])
      .then(([appInfo, deviceInfo]) => {
        if (cancelled) return
        const app = Object.fromEntries(Object.entries(appInfo as object)) as Record<string, unknown>
        const device = Object.fromEntries(Object.entries(deviceInfo as object)) as Record<string, unknown>
        setInfo({ appInfo: app, deviceInfo: device })
        saveIndividualDeviceInfo({ appInfo: app, deviceInfo: device }).catch(() => {})
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  if (!info) return <p className="text-xs text-muted-foreground py-2">Capacitor-Infos nur in der nativen App sichtbar.</p>
  return (
    <div className="w-full rounded-xl border border-primary/20 bg-primary/5 p-3 text-left">
      <div className="mb-2 flex items-center gap-2 border-b border-border/50 pb-2">
        <Smartphone className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Capacitor – App & Gerät</span>
      </div>
      <div className="space-y-3 text-[11px]">
        <div>
          <p className="mb-1 font-medium text-muted-foreground">App (App.getInfo())</p>
          <ul className="space-y-0.5 rounded-lg bg-background/50 p-2 font-mono">
            {Object.entries(info.appInfo).map(([key, value]) => (
              <li key={key} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{key}</span>
                <span className="truncate text-foreground">{formatCapacitorValue(value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium text-muted-foreground">Gerät (Device.getInfo())</p>
          <ul className="space-y-0.5 rounded-lg bg-background/50 p-2 font-mono">
            {Object.entries(info.deviceInfo).map(([key, value]) => (
              <li key={key} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{key}</span>
                <span className="truncate text-foreground">{formatCapacitorValue(value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground border-t border-border/50 pt-2">
        Gespeichert unter individuelle Geräte-Info (getrennt von Cloud-Sync).
      </p>
    </div>
  )
}

export function VersionBadge() {
  const [phase16Open, setPhase16Open] = useState(false)
  const [checking, setChecking] = useState(false)
  const { toast } = useToast()
  const {
    downloadUrl,
    updateAvailable,
    latestVersion,
    apkSha256,
    checkNow,
    openDownload,
    showSoftPrompt,
  } = useAppUpdate()
  const updateLink = resolveSafeApkDownloadUrl(downloadUrl, APP_UPDATE_DOWNLOAD_URL)
  const githubReleasePage = getGithubReleasePageUrl(updateLink)

  const handleManualUpdateCheck = async () => {
    setChecking(true)
    try {
      const info = await checkNow("manual")
      if (!info) {
        toast({
          title: "Prüfung fehlgeschlagen",
          description: "Update-Check konnte nicht ausgeführt werden.",
          variant: "destructive",
        })
        return
      }
      if (!info.remoteFetched && !info.updateAvailable) {
        toast({
          title: "Prüfung fehlgeschlagen",
          description: "Remote-version.json konnte nicht geladen werden (Netzwerk oder Quelle).",
          variant: "destructive",
        })
        return
      }
      if (info.updateAvailable) {
        showSoftPrompt()
        toast({
          title: "Update verfügbar",
          description: `${info.label || info.latestVersion} – Download von GitHub Releases.`,
        })
      } else {
        toast({
          title: "Keine neue Version",
          description: "Du hast bereits die neueste Version.",
        })
      }
    } catch {
      toast({
        title: "Prüfung fehlgeschlagen",
        description: "Update-Check konnte nicht ausgeführt werden.",
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  const handleOpenApkDownload = async () => {
    const ok = await openDownload()
    if (!ok) {
      toast({
        title: "Download nicht erlaubt",
        description: "Die Update-URL ist nicht in der erlaubten Host-Liste.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="w-3 h-3" />
        <span>FamiApp {APP_VERSION.display}</span>
        <span className="text-muted-foreground/60">•</span>
        <span>{BUILD_INFO.formatted}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/80">Entwickler: {APP_DEVELOPER}</p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] h-auto gap-1.5 px-3 py-2 text-[10px] text-muted-foreground/80 hover:text-foreground"
          onClick={handleManualUpdateCheck}
          disabled={checking}
        >
          <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Wird geprüft…" : "Update prüfen"}
        </Button>
        <Dialog open={phase16Open} onOpenChange={setPhase16Open}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] h-auto gap-1.5 px-3 py-2 text-[10px] text-muted-foreground/80 hover:text-foreground"
            >
              <Sparkles className="h-3 w-3" />
              Phase Update
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                App-Update (GitHub Releases)
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <p className="text-xs text-muted-foreground">
                Aktuelle Version: <span className="font-medium text-foreground">{APP_VERSION.display}</span>
              </p>
              {updateAvailable && latestVersion && (
                <p className="text-xs font-medium text-primary">
                  Update verfügbar: {latestVersion.startsWith("V") ? latestVersion : `V${latestVersion}`}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] w-full gap-2"
                  onClick={handleManualUpdateCheck}
                  disabled={checking}
                >
                  <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                  {checking ? "Wird geprüft…" : "Update prüfen"}
                </Button>
                <Button
                  size="sm"
                  className="min-h-[44px] w-full gap-2 bg-blue-600 hover:bg-blue-500"
                  onClick={handleOpenApkDownload}
                >
                  <Download className="h-4 w-4" />
                  Jetzt updaten
                </Button>
              </div>
              <p className="text-left text-[11px] text-muted-foreground">
                Sideload: Die APK kommt von GitHub Releases (signiert). Android prueft die Signatur;
                Installation ist nicht still. Nach dem Download hier zurueckkehren und dieses Fenster schliessen.
              </p>
              {apkSha256 ? (
                <p className="text-left text-[10px] font-mono text-muted-foreground break-all">
                  Pruefsumme (SHA-256): {apkSha256}
                </p>
              ) : (
                <p className="text-left text-[10px] text-muted-foreground">
                  Pruefsumme steht im GitHub-Release (version.json: apkSha256).
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-3 min-h-[44px] w-full" onClick={() => setPhase16Open(false)}>
              Schließen
            </Button>
          </DialogContent>
        </Dialog>
        {githubReleasePage && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] h-auto gap-1.5 px-3 py-2 text-[10px] text-muted-foreground/80 hover:text-foreground"
            onClick={() => openSafeUpdateUrl(githubReleasePage)}
          >
            <ExternalLink className="h-3 w-3" />
            GitHub Updates
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/80">
        Update-Quelle: GitHub Releases
      </p>
    </div>
  )
}
