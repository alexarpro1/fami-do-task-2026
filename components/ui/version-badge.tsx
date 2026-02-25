"use client"

import { Info, Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState } from "react"
import { APP_VERSION, BUILD_INFO } from "@/lib/version"

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

export function VersionBadge() {
  const [open, setOpen] = useState(false)

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
        <p className="text-[10px] text-muted-foreground/80">Aktuelle Version – bei Updates erscheint oben ein Hinweis.</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-xl gap-2 h-8 text-xs bg-transparent">
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
