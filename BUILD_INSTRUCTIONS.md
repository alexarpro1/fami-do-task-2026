# FamiApp - Android APK Build Anleitung

## Versionierte APK-Ordner (build-apk.bat)

Wenn du **`build-apk.bat`** (Doppelklick oder aus dem Projektordner) ausführst:

- Die **Version** wird aus `version.json` gelesen (z. B. **V2.6.0.16**).
- Die **Release-APK** wird unter dem Android-Build-Ordner in einem **versionsbezogenen Ordner** abgelegt (nichts wird überschrieben):
  - `android\app\build\outputs\apk\V2.6.0.16\FamiApp-V2.6.0.16.apk`
  - `android\app\build\outputs\apk\V2.6.0.17\FamiApp-V2.6.0.17.apk` (nächster Build)
- So findest du alle Versionen unter **`android\app\build\outputs\apk`** und kannst bei Problemen eine ältere Version installieren.

**Hinweis:** Cursor und Android Studio vor dem Lauf schließen, falls der Build mit „Unable to delete directory“ abbricht.

### Wenn `packageDebug` oder `clean` mit "Failed to clean up output files" / "Unable to delete directory" fehlschlägt

Ein anderer Prozess hält Dateien in `android\build` oder `android\app\build` offen.

1. **Android Studio** vollständig schließen (kein Projekt aus diesem Ordner offen).
2. **Alle Terminals/CMD** schließen, die im Ordner `fami-do-task 2026` oder `android` laufen.
3. Optional: **Windows Explorer** schließen, falls du in `android\build` oder `app\build` bist.
4. Neu versuchen:
   - Im Projektroot: `.\android-clean-run.bat` (führt Gradle-Clean + `cap run android` aus),
   - oder manuell: `cd android` → `gradlew.bat --stop` → `gradlew.bat clean` → `cd ..` → `npx cap run android`.

---

## App-Update für Android Studio (schnell)

Wenn du nur ein **Update** bauen willst und das Projekt schon eingerichtet ist:

1. **Version ist abgestimmt** – aktuell **2.6.0** (versionCode 101) in `package.json`, `version.json` und `android/app/build.gradle`.
2. **Web-Build + Sync:**
   ```bash
   npm run mobile:update
   ```
   Das erstellt den statischen Export (`out/`) und kopiert ihn nach `android/`.
3. **Android Studio öffnen:**
   ```bash
   npm run android:open
   ```
   (oder `npx cap open android` – bereinigt vorher alte Builds mit `android:open`)
4. **In Android Studio:**
   - Auf **Gradle Sync** warten (unten rechts).
   - **Build → Build Bundle(s) / APK(s) → Build APK(s)** für Debug-APK.
   - Oder **Build → Generate Signed Bundle / APK** für Release-APK.

**Hinweis:** Bei jeder neuen App-Version (z. B. 2.7.0) `versionCode` in `android/app/build.gradle` um 1 erhöhen (z. B. 102) und `versionName` anpassen (z. B. `"2.7.0"`).

---

## Phase 1: Vorbereitung (Bereits erledigt ✅)
- ✅ Capacitor Konfiguration erstellt
- ✅ Package.json mit Capacitor Dependencies aktualisiert
- ✅ Build Scripts hinzugefügt
- ✅ PWA Manifest optimiert
- ✅ Mobile Safe Area Support
- ✅ Keyboard Handling

## Phase 2: Auf deinem Computer

### Voraussetzungen installieren

**1. Node.js** (solltest du bereits haben)
```bash
node --version  # Mindestens v18+
```

**2. Android Studio**
- Download: https://developer.android.com/studio
- Installiere Android Studio mit SDK
- Öffne Android Studio → Settings → Android SDK
- Installiere mindestens Android 13.0 (API 33)

**3. Java JDK**
```bash
java --version  # Mindestens Java 11
```
Falls nicht installiert: https://adoptium.net/

### Projekt Setup

**Schritt 1: Code herunterladen**
- Code herunterladen: Projekt als ZIP exportieren und entpacken
- Entpacke die Datei in einen Ordner deiner Wahl
- Öffne Terminal/CMD im entpackten Ordner

**Schritt 2: Environment Variables einrichten (OPTIONAL)**
Die App funktioniert jetzt **vollständig ohne Supabase**! 

Falls du Cloud-Sync möchtest, erstelle eine `.env.local` Datei:
```env
NEXT_PUBLIC_SUPABASE_URL=deine_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_supabase_key
```

**Ohne Supabase:**
- ✅ QR-Code Sync funktioniert lokal (IndexedDB/localStorage)
- ✅ Alle Kernfunktionen verfügbar
- ✅ Vollständig offline-fähig
- ⚠️ QR-Codes können nicht zwischen verschiedenen Geräten geteilt werden

**Schritt 3: Dependencies installieren**
```bash
npm install
```

**Schritt 4: Android Platform hinzufügen**
```bash
npx cap add android
```

**Schritt 5: Build erstellen**
```bash
npm run mobile:build
```

Dies erstellt den statischen Export und öffnet automatisch Android Studio.

### APK erstellen

**In Android Studio:**

1. **Warte auf Gradle Sync** (unten rechts, kann 5-10 Minuten dauern beim ersten Mal)

2. **Debug APK** (zum Testen auf deinem Handy):
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Warte bis "BUILD SUCCESSFUL" erscheint
   - APK findest du in: `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Release APK** (für Veröffentlichung/Familie):
   - Build → Generate Signed Bundle / APK
   - Wähle "APK"
   - Klicke "Create new..." für neuen Keystore
   - Speicherort wählen (z.B. `android/famiapp-keystore.jks`)
   - Passwort erstellen (WICHTIG: gut aufbewahren!)
   - Key Alias: "famiapp"
   - Finish
   - APK findest du in: `android/app/build/outputs/apk/release/app-release.apk`

### APK auf Handy installieren

**Option A: USB-Kabel (empfohlen)**
1. Handy: Einstellungen → Über das Telefon → 7x auf "Build-Nummer" tippen
2. Zurück → Entwickleroptionen → "USB-Debugging" aktivieren
3. Handy mit Computer verbinden
4. Kopiere APK-Datei auf Handy (z.B. in Downloads)
5. Auf dem Handy: Öffne Dateimanager → finde APK → tippe drauf
6. "Installation aus unbekannten Quellen" erlauben wenn gefragt
7. Installieren → Öffnen

**Option B: Cloud Upload**
1. Lade APK auf Google Drive / Dropbox / WeTransfer hoch
2. Öffne Link auf dem Handy im Browser
3. Download APK
4. Installiere wie bei Option A beschrieben

**Option C: QR-Code (einfachste Methode)**
1. Lade APK auf einen Server hoch
2. Erstelle QR-Code mit Link zur APK
3. Scanne QR-Code mit Handy → Download → Installieren

### Nach der Installation

**Erste Schritte:**
1. Öffne FamiApp
2. Falls du Master/Eltern bist:
   - Einstellungen → Admin → Familie verwalten
   - Klicke "Familie erstellen"
   - Notiere dir den Familien-Code
   - Teile QR-Code mit Kind-Geräten

3. Falls du auf Kind-Gerät bist:
   - Einstellungen → Admin → Familie verwalten
   - Klicke "Familie beitreten"
   - Scanne QR-Code oder gib Code ein

**Die Sync funktioniert automatisch:**
- Alle Änderungen werden nach 2 Sekunden synchronisiert
- Realtime-Updates zwischen Geräten
- Offline-fähig (Sync erfolgt beim Reconnect)

## Troubleshooting

**Problem: "Android SDK not found"**
```bash
# Mac/Linux:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Windows (CMD):
setx ANDROID_HOME "C:\Users\DEIN_NAME\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools"
```

**Problem: Gradle Build Fehler**
- In Android Studio: File → Invalidate Caches → Restart
- Oder lösche `android/.gradle` Ordner und baue neu

**Problem: App startet mit weißem Bildschirm**
- Die App funktioniert jetzt ohne Supabase - keine `.env.local` nötig!
- Prüfe Browser-Konsole auf Fehler
- Öffne Chrome DevTools auf dem Handy:
  - Chrome auf PC → `chrome://inspect`
  - Finde FamiApp → "inspect"

**Problem: "Installation blockiert"**
- Einstellungen → Sicherheit → "Installation aus unbekannten Quellen" erlauben
- Bei neueren Android: "Diese Quelle erlauben" für den Browser/Dateimanager

**Problem: Sync funktioniert nicht**
- QR-Code Sync funktioniert jetzt lokal (kein Internet nötig)
- Für Cloud-Sync: Prüfe Supabase-Konfiguration in `.env.local`
- Console-Log in Chrome DevTools checken (siehe `[SYNC]` oder `[LOCAL-SYNC]` Logs)

## Alternative: PWA (noch einfacher!)

Wenn dir der APK-Build zu kompliziert ist:

**Methode 1: Vercel Deployment (empfohlen)**
1. In deiner Hosting-Plattform (z. B. Vercel): Auf "Publish" / Deploy klicken
2. Vercel erstellt automatisch eine URL: `https://famiapp.vercel.app`
3. Auf dem Handy: Öffne die URL in Chrome
4. Chrome Menü → "Zum Startbildschirm hinzufügen"
5. Fertig! Die App funktioniert wie eine native App

**Vorteile von PWA:**
- Kein Download/Installation nötig
- Automatische Updates (immer neueste Version)
- Funktioniert auf iOS und Android
- Offline-fähig durch Service Worker
- Teilen einfach per Link

**Nachteile von PWA:**
- Etwas langsamer beim ersten Start
- Weniger native Features (aber für FamiApp ausreichend)

## Weitere Features für die Zukunft

Wenn die App gut läuft, kannst du später:
- Im Google Play Store veröffentlichen (Einmalgebühr $25)
- Push-Notifications hinzufügen
- Biometric Login (Fingerprint/Face ID)
- Camera Integration für QR-Scan
- Offline-Modus mit lokaler DB

## Support

Falls du Hilfe brauchst:
- Checke die Logs in Android Studio (Logcat)
- Öffne Chrome DevTools für Web-Debugging
- Support-Dokumentation oder Entwickler-Community nutzen

Viel Erfolg mit dem Build! 🚀
