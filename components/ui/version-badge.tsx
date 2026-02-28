"use client"

import { Info, Download, FileText, RefreshCw, Sparkles, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useEffect } from "react"
import { APP_VERSION, BUILD_INFO, APP_UPDATE_DOWNLOAD_URL } from "@/lib/version"
import { getUpdateInfo, MANUAL_UPDATE_CHECK_EVENT } from "@/lib/sync-v2/version-client"
import { getUpdateCheckAdapter } from "@/lib/sync-v2/adapters"
import { useToast } from "@/hooks/use-toast"
import { useAppUpdate } from "@/hooks/useAppUpdate"
import { isNativeApp, saveIndividualDeviceInfo } from "@/lib/device"

const BUILD_INSTRUCTIONS = `# FamiApp - Android APK Build Anleitung

## Phase 1: Vorbereitung (Bereits erledigt ✅)
- ✅ Capacitor Konfiguration erstellt
- ✅ Package.json mit Capacitor Dependencies aktualisiert
- ✅ Build Scripts hinzugefügt
- ✅ PWA Manifest optimiert

## Phase 2: Auf deinem Computer

### Voraussetzungen installieren

**1. Node.js** (solltest du bereits haben)
\`\`\`bash
node --version  # Mindestens v18+
\`\`\`

**2. Android Studio**
- Download: https://developer.android.com/studio
- Installiere Android Studio mit SDK
- Öffne Android Studio → Settings → Android SDK
- Installiere mindestens Android 13.0 (API 33)

**3. Java JDK**
\`\`\`bash
java --version  # Mindestens Java 11
\`\`\`

### Projekt Setup

**Schritt 1: Code herunterladen**
- Code herunterladen: Projekt als ZIP exportieren und entpacken
- Entpacke die Datei in einen Ordner deiner Wahl
- Öffne Terminal/CMD im entpackten Ordner

**Schritt 2: Dependencies installieren**
\`\`\`bash
npm install
\`\`\`

**Schritt 3: Capacitor initialisieren**
\`\`\`bash
npx cap add android
\`\`\`

**Schritt 4: App bauen und zu Android kopieren**
\`\`\`bash
npm run build
npx cap sync
\`\`\`

**Schritt 5: Android Studio öffnen**
\`\`\`bash
npx cap open android
\`\`\`

**Schritt 6: APK erstellen**
- In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- Warte bis "APK generated successfully" erscheint
- APK liegt in: \`android/app/build/outputs/apk/debug/app-debug.apk\`

**Schritt 7: APK auf Handy installieren**
- Kopiere APK auf dein Handy
- Öffne die APK-Datei
- Erlaube "Installation aus unbekannten Quellen"
- Installieren!

### Alternative: PWA (Ohne APK-Build)

Wenn APK-Build zu kompliziert ist:
1. App auf Vercel (oder anderem Hosting) deployen
2. Auf Handy im Browser öffnen
3. "Zum Startbildschirm hinzufügen"
4. Funktioniert wie eine native App!

## Troubleshooting

**Problem: Gradle sync failed**
→ Internet prüfen, Android Studio neustarten

**Problem: SDK not found**
→ Android Studio → Tools → SDK Manager → Android 13 installieren

**Problem: APK installation failed**
→ Alte Version deinstallieren, "Unbekannte Quellen" aktivieren

Bei Fragen: Die BUILD_INSTRUCTIONS.md im Projekt hat noch mehr Details!
`

export interface CapacitorRuntimeInfo {
  appInfo: Record<string, unknown>
  deviceInfo: Record<string, unknown>
}

function formatCapacitorValue(v: unknown): string {
  if (v === undefined || v === null) return "—"
  if (typeof v === "boolean") return v ? "Ja" : "Nein"
  return String(v)
}

/** Capacitor-App- und Geräteinfos (für Entwickler-Optionen). */
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
  const [open, setOpen] = useState(false)
  const [phase16Open, setPhase16Open] = useState(false)
  const [checking, setChecking] = useState(false)
  const { toast } = useToast()
  const { downloadUrl, updateAvailable, latestVersion } = useAppUpdate()
  const updateLink = downloadUrl || APP_UPDATE_DOWNLOAD_URL

  const handleManualUpdateCheck = async () => {
    setChecking(true)
    try {
      const adapter = getUpdateCheckAdapter()
      const info = await getUpdateInfo(adapter)
      if (info.available) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(MANUAL_UPDATE_CHECK_EVENT, { detail: info }))
        }
        toast({
          title: "Update verfügbar",
          description: `${info.label} – siehe Hinweis oben.`,
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

  const handleDownloadInstructions = () => {
    const blob = new Blob([BUILD_INSTRUCTIONS], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "FamiApp-APK-Build-Anleitung.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>FamiApp {APP_VERSION.display}</span>
          <span className="text-muted-foreground/60">•</span>
          <span>{BUILD_INFO.formatted}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-1 px-2 text-[10px] text-muted-foreground/80 hover:text-foreground gap-1.5"
            onClick={handleManualUpdateCheck}
            disabled={checking}
          >
            <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Wird geprüft…" : "Update prüfen"}
          </Button>
          <Dialog open={phase16Open} onOpenChange={setPhase16Open}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-[10px] text-muted-foreground/80 hover:text-foreground gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                Phase Update
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Phase 16: Forced App Update (OTA)
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                <p className="text-xs text-muted-foreground">
                  Aktuelle Version: <span className="font-medium text-foreground">{APP_VERSION.display}</span>
                </p>
                {updateAvailable && latestVersion && (
                  <p className="text-xs text-primary font-medium">
                    Update verfügbar: {latestVersion.startsWith("V") ? latestVersion : `V${latestVersion}`}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => window.open(updateLink, "_blank")}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Update prüfen
                  </Button>
                  <Button
                    size="sm"
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-500"
                    onClick={() => window.open(updateLink, "_blank")}
                  >
                    <Download className="w-4 h-4" />
                    Jetzt updaten
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-left">
                  Hinweis: Der Download öffnet sich in einem neuen Browser-Fenster. Danach kannst du hier zur App
                  zurückkehren und dieses Fenster schließen.
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setPhase16Open(false)}>
                Schließen
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-xl gap-2 h-8 text-xs bg-transparent" disabled>
            <Download className="w-3 h-3" />
            APK bauen
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Android APK Build Anleitung
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: BUILD_INSTRUCTIONS.replace(/\n/g, "<br/>") }} />
              </div>
            </div>
          </ScrollArea>
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleDownloadInstructions} className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Anleitung herunterladen
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
