# FamiApp – Dokumentation & Anleitungen

Diese Datei fasst alle wichtigen Abläufe und Änderungen zusammen. Immer hier nachschauen, wenn du etwas vergessen hast.

---

> **Nicht vergessen:** Bei jedem **Update** immer **`npm run version:update`** ausführen – dann wird die Version erhöht **und** gleichzeitig ein versioniertes Backup des wichtigsten Codes erstellt (`backups/backup-v...`). So geht nichts verloren.

(1. Regel: Update = Bump + Backup
Cursor-Regel: .cursor/rules/update-and-backup.mdc
Beim nächsten Mal, wenn du (oder ich) ein Update mache, gilt: immer auch ein versioniertes Backup des wichtigsten Codes erstellen und mit Version + Datum bezeichnen.
Dokumentation: In DOCUMENTATION.md steht unter „Version & Updates“ der Abschnitt „Bei jedem Update: immer mit Backup“ inkl. Ablauf und Skripten.
2. Neue Skripte
Befehl	Bedeutung
npm run version:update	Bump + Backup in einem Schritt (empfohlen bei jedem Update).
npm run version:backup	Nur Backup erstellen (z. B. nach manuellem Bump).
3. Was das Backup enthält
Seiten: app/
Komponenten: components/
Kernlogik & Typen: lib/, types/, context/, hooks/
Assets & Version: public/
Konfiguration: version.json, package.json, next.config.mjs, tsconfig.json, postcss.config.mjs, capacitor.config.ts
Skripte: z. B. increment-version.js, sync-version-public.js, version-backup.js, clean-android-builds.js, run-android-bs.js
Doku: DOCUMENTATION.md
Es werden keine node_modules, .next, out oder Build-Ordner mitkopiert.
4. Bezeichnung des Backups
Ordner: backups/backup-v{Major}.{Minor}.{Patch}.{Build}-{JJJJ-MM-TT}
Beispiel: backups/backup-v2.6.0.4-2026-02-22
Darin liegt eine README.txt mit Version und Erstellzeitpunkt.
5. Getestet
npm run version:backup wurde ausgeführt; es wurde backups/backup-v2.6.0.4-2026-02-22 angelegt.
.gitignore enthält /backups/, damit Backups lokal bleiben (Zeile kannst du entfernen, wenn du Backups ins Repo aufnehmen willst).
Für die Zukunft: Bei jedem Update npm run version:update ausführen – dann passieren Bump und versioniertes Backup automatisch zusammen.)

---

## 1. Version & Updates

### Wo die Version steht
- **version.json** (Projektroot) – Quelle für Build-Nummer und Datum
- **lib/version.ts** – wird in der App angezeigt (Sidebar: „FamiApp V2.5.0.100 • 21.02.2026, 13:00“)
- **public/version.json** – wird für den **Update-Check** genutzt (muss mit version.json übereinstimmen)

### Nur Build-Nummer erhöhen (z.B. 2.5.0.100 → 2.5.0.101)
- Einfach **`npm run build`** oder **`npm run export`** ausführen.
- Das Skript `increment-version.js` erhöht die Build-Nummer automatisch und schreibt alle drei Stellen + Datum.

### Neue Version setzen (z.B. 2.6.0 oder 3.0.0)
1. **version.json** bearbeiten: `major`, `minor`, `patch` (und ggf. `build` auf 0), `lastUpdated` auf aktuelles Datum (ISO).
2. **lib/version.ts** bearbeiten: `major`, `minor`, `patch`, `build` und `timestamp: new Date("...")` anpassen.
3. **`npm run version:sync`** ausführen → aktualisiert **public/version.json** für den Update-Check.

### Update-Hinweis für Nutzer (ältere Versionen)
- Die App lädt beim Start **/version.json** (vom gleichen Server oder von `NEXT_PUBLIC_VERSION_CHECK_URL`).
- Ist die Server-Version **höher** als die eingebaute, erscheint oben ein Banner: **„Update verfügbar“** mit Button **„Aktualisieren“**.
- Für die **Android-App**: In der Umgebung **NEXT_PUBLIC_VERSION_CHECK_URL** auf die Produktiv-URL setzen (z.B. `https://deine-app.de`), damit der Update-Check die richtige version.json abfragt.

### NPM-Skripte
| Befehl | Bedeutung |
|--------|-----------|
| `npm run version:bump` | Erhöht nur die Build-Nummer (version.json + lib/version.ts + public/version.json). |
| `npm run version:sync` | Kopiert version.json nach public/version.json, ohne etwas zu erhöhen. Nach manueller Änderung von major/minor/patch ausführen. |
| `npm run version:backup` | Erstellt ein versioniertes Backup des wichtigsten Codes (siehe unten). |
| **`npm run version:update`** | **Bump + Backup in einem Schritt.** Empfohlen bei jedem Update. |

### Bei jedem Update: immer mit Backup *(nicht vergessen!)*
**Regel:** Wenn wir ein Update machen, gleichzeitig ein **versioniertes Backup** des wichtigsten Codes anlegen und **bezeichnen** (Version + Datum).  
→ **Kurz:** `npm run version:update` – dann ist Bump + Backup erledigt.

- **Ein Befehl:** **`npm run version:update`**  
  → erhöht die Build-Nummer und erstellt sofort ein Backup unter `backups/backup-v2.6.0.4-2026-02-22/`.

- **Was gesichert wird:**  
  Seiten (`app/`), Komponenten (`components/`), Lib, Types, Context, Hooks, `public/`, Konfiguration (package.json, next.config, tsconfig, tailwind, capacitor), Skripte (Version, Backup, Android), `DOCUMENTATION.md`.  
  Keine `node_modules`, keine Build-Ordner.

- **Bezeichnung:**  
  `backups/backup-v{Major}.{Minor}.{Patch}.{Build}-{JJJJ-MM-TT}/`  
  z.B. `backup-v2.6.0.4-2026-02-22`.

- Optional: Ordner `backups/` in `.gitignore` eintragen, wenn Backups nur lokal bleiben sollen; oder committen, wenn ihr sie versionieren wollt.

### Dev-Server: „Lost connection to server“ (Next.js/Turbopack)
Wenn der Dev-Server abstürzt oder die Meldung **„Lost connection to server“** erscheint:

- **`npm run dev:clean`** – löscht den `.next`-Cache (und Lock) und startet den Dev-Server neu. Meist reicht das.
- **`npm run dev:webpack`** – startet den Dev-Server mit Webpack statt Turbopack (stabiler Fallback, wenn Turbopack Probleme macht).

(1. Regel: Update = Bump + Backup
Cursor-Regel: .cursor/rules/update-and-backup.mdc
Beim nächsten Mal, wenn du (oder ich) ein Update mache, gilt: immer auch ein versioniertes Backup des wichtigsten Codes erstellen und mit Version + Datum bezeichnen.
Dokumentation: In DOCUMENTATION.md steht unter „Version & Updates“ der Abschnitt „Bei jedem Update: immer mit Backup“ inkl. Ablauf und Skripten.
2. Neue Skripte
Befehl	Bedeutung
npm run version:update	Bump + Backup in einem Schritt (empfohlen bei jedem Update).
npm run version:backup	Nur Backup erstellen (z. B. nach manuellem Bump).
3. Was das Backup enthält
Seiten: app/
Komponenten: components/
Kernlogik & Typen: lib/, types/, context/, hooks/
Assets & Version: public/
Konfiguration: version.json, package.json, next.config.mjs, tsconfig.json, postcss.config.mjs, capacitor.config.ts
Skripte: z. B. increment-version.js, sync-version-public.js, version-backup.js, clean-android-builds.js, run-android-bs.js
Doku: DOCUMENTATION.md
Es werden keine node_modules, .next, out oder Build-Ordner mitkopiert.
4. Bezeichnung des Backups
Ordner: backups/backup-v{Major}.{Minor}.{Patch}.{Build}-{JJJJ-MM-TT}
Beispiel: backups/backup-v2.6.0.4-2026-02-22
Darin liegt eine README.txt mit Version und Erstellzeitpunkt.
5. Getestet
npm run version:backup wurde ausgeführt; es wurde backups/backup-v2.6.0.4-2026-02-22 angelegt.
.gitignore enthält /backups/, damit Backups lokal bleiben (Zeile kannst du entfernen, wenn du Backups ins Repo aufnehmen willst).
Für die Zukunft: Bei jedem Update npm run version:update ausführen – dann passieren Bump und versioniertes Backup automatisch zusammen.)

---

## 1b. Sync (neu: ein einziger Sync-Manager)

Die bisherige WLAN-, Cloud- und Geräte-Sync-Logik wurde entfernt. Es gibt jetzt **einen zentralen Sync-Manager**: **lib/sync/sync-manager.ts** (`SyncManager`: `init()`, `connect()`, `disconnect()`, `send()`, `onData()`; Singleton `getSyncManager()`). Optional: **lib/sync/sync-utils.ts** für `SyncEntity<T>`, `mergeSyncData()`, Tombstones. Alle früheren Abschnitte zu WLAN/Cloud/Discovery sind obsolet; neue Transport-Logik kann schrittweise im SyncManager ergänzt werden.

---

## 2. Android Build & Start

### Vor dem Öffnen in Android Studio (wichtig)
- Immer zuerst **Android Studio schließen**.
- Dann im Projektordner: **`npm run android:clean`**
- Danach Android Studio wieder öffnen und bauen.

So vermeidest du den Fehler **„Unable to delete directory“** (gesperrte Build-Ordner).

### Android starten
| Befehl | Bedeutung |
|--------|-----------|
| `npm run android:clean` | Gradle-Daemons stoppen, alle Build-Ordner löschen. Vor dem Öffnen in Android Studio ausführen. |
| `npm run android:open` | Clean ausführen und danach Android Studio öffnen. |
| `npm run android:pixel9` | App auf Pixel-9-Emulator starten. |
| `npm run android:bs` | App auf BlueStacks starten (BlueStacks muss laufen). |
| `npm run android:list` | Zeigt verfügbare Geräte/Emulatoren. |

### BlueStacks
- BlueStacks starten.
- **`npm run android:bs`** verbindet automatisch, baut (falls nötig), installiert und startet die App.

### Gradle-Daemon (dauerhafte Einstellung)
- In **android/gradle.properties** steht **org.gradle.daemon=false**, damit keine Prozesse die Build-Ordner sperren.
- In Android Studio unter Einstellungen den Gradle-Daemon **nicht** wieder aktivieren.

---

## 3. Backup

### App-Backup (Einstellungen) prüfen
- **Ort:** Admin → „Backup & Wiederherstellung“ aufklappen.
- **„Jetzt herunterladen“:** Lädt eine JSON-Datei mit `type: "all"`, `state` (Kinder, Aufgaben, Belohnungen, Einstellungen). Dateiname: `famido-komplett-backup-…`.
- **Export Einstellungen / Daten / Alles:** Erzeugen dasselbe Format (bzw. nur Einstellungen oder nur Daten); **Alles** entspricht dem Format von „Jetzt herunterladen“.
- **„Backup-Datei auswählen“:** Öffnet den Datei-Dialog. Nach Auswahl: `validateBackup` und ggf. Import-Modal mit Merge-Optionen (Kinder, Aufgaben, Belohnungen, Regeln). Bestätigung ruft `importBackupWithMigration` auf und schreibt per `LOAD_STATE` + localStorage.
- **Kurztest:** 1) „Jetzt herunterladen“ klicken → Datei wird geladen. 2) „Backup-Datei auswählen“ → diese Datei wählen → Modal erscheint → „Import bestätigen“ → Daten sollten übernommen werden. Altes Format (users/tasks/rewards) wird von `lib/backup-migration.ts` erkannt und migriert.

### Sinnvolles Vorgehen
- **Dev-Server und Android Studio schließen.**
- Im Projektordner ein Backup erstellen (z.B. ZIP), **ohne**:
  - `node_modules`
  - `.next`
  - `android/app/build`, `android/build`
  - `.git` (optional)
- So bleibt die ZIP klein und es gibt keine Sperrfehler.

---

## 3b. Supabase Cloud-Sync (Phase 14) & Anonymous Auth

- **Device-ID / Familien-Code:** Einstellungen → „Cloud-Sync (Geräte verbinden)“. Die App nutzt **Anonymous Sign-In** und setzt `user_metadata.sync_id` im JWT; RLS-Policies erlauben Zugriff nur auf Zeilen mit passender `sync_id`.
- **Anonymous User = Rolle „authenticated“:** Supabase behandelt anonyme User wie normale authentifizierte User (Rolle `authenticated`). Optional kann man mit `auth.jwt()->>'is_anonymous'` zwischen anonym und dauerhaft unterscheiden (z. B. restrictive Policy).
- **Aufräumen alter anonymer User (optional):** Im Supabase SQL-Editor z. B. alle 30 Tage ausführen:
  ```sql
  DELETE FROM auth.users
  WHERE is_anonymous IS TRUE AND created_at < now() - interval '30 days';
  ```
- **Anonymous Sign-In aktivieren:** Supabase-Dashboard → Authentication → Providers → **Anonymous** aktivieren. Ohne das schlägt Backup→Cloud mit RLS-Fehler fehl.
- **Pull-to-Refresh:** Wenn Cloud-Sync (Familien-Code) aktiv ist, kann die App durch **Wischen von oben nach unten** (Finger oben halten und ziehen, wie im Browser) manuell aktualisiert werden. Die Daten werden dann erneut von Supabase geladen. Komponente: `components/ui/pull-to-refresh.tsx`, Kontext: `context/sync-refresh-context.tsx`.
- **Live-Updates:** Der **SupabaseDataLoader** abonniert Supabase Realtime (Postgres Changes) für die Sync-Tabellen. Änderungen auf einem Gerät werden auf anderen verbundenen Geräten (gleicher Familien-Code) automatisch nachgeladen. Zusätzlich kann jederzeit per Pull-to-Refresh manuell aktualisiert werden.

---

## 4. Spiele-UI (Schach, Dame & neue Spiele)

### Einheitliches Layout-Muster (Platzierung)

Für alle Spiele mit **Neu starten**, **Einstellungen**, **Regeln** und **Herausforderungen** gilt dieselbe Reihenfolge und Anordnung. Neue Spiele sollen dieses Muster übernehmen.

**Reihenfolge von oben nach unten:**

1. **Infoleiste**  
   Level/Status + Buttons **„Einstellungen“** und **„Neu starten“** (flex-wrap, gleiche Zeile wo Platz).

2. **Goldene Regeln + Herausforderungen nebeneinander**  
   - Ein Container mit **`grid gap-3 md:grid-cols-2`**.  
   - **Links:** „Die goldenen Regeln“ (aufklappbar, `rounded-xl border border-border bg-muted/30`).  
   - **Rechts:** „Herausforderungen“ (Karten-Liste, `rounded-xl border border-border bg-card p-3`).  
   - Auf kleinen Screens: untereinander; ab `md`: zwei Spalten (jeweils ca. 50 %).

3. **Einstellungen**  
   - **Unter** Regeln und Herausforderungen.  
   - Nur sichtbar, wenn „Einstellungen“ geöffnet ist (`showSettings`).  
   - Block: `p-4 rounded-xl bg-muted/50 border border-border space-y-4`.

4. **Spielinhalt**  
   - Geschlagene Figuren / Letzter Zug / Zug-Anzeige / Brett (oder spielspezifischer Inhalt).

**Referenz-Implementierung:**  
- **Dame:** `components/games/dame-game.tsx`  
- **Schach:** `components/games/chess-game.tsx`

**Dialog „Neues Spiel“:**
- Overlay mit Dialog oben zentriert (z. B. `items-start justify-center pt-6`), damit der Dialog auf allen Geräten und Bildschirmgrößen immer im oberen Bereich bleibt.

---

- **Einstellungen** und **Neu starten** (bzw. Reset) sollen **deutlich erkennbar** sein: immer **Text + Icon**, nicht nur Icon.
- Buttons: **mindestens h-11**, **min-w-[44px]** (gut tippbar), **text-sm font-medium**, Variante **outline** oder **secondary**.
- Beispiele: `Einstellungen` mit Zahnrad-Icon, `Neu starten` mit RotateCcw-Icon. Dasselbe Muster bei allen Spielen verwenden, die Einstellungen oder Zurücksetzen haben.

## 5. Platzhalter & Icons

- **public/placeholder.jpg** – Platzhalter für fehlende Bilder (sichtbar hellgrau + Icon).
- **public/placeholder-user.jpg** – Platzhalter für Benutzer-Avatar.
- **public/icon.svg** – App-Icon (SVG mit eingebettetem Logo; wird z.B. als Favicon genutzt).
- Logo-Quelle für Icon: **FamiDo Task  LOGO-2.png**. Neues SVG erzeugen mit: **`node scripts/embed-icon-svg.js`** (schreibt public/icon.svg).
- **Android-Splash:** `android/app/src/main/res/drawable/splash.png` wird aus demselben Logo befüllt. Austausch mit: **`npm run android:splash`** (nutzt scripts/copy-splash-from-logo.js).

---

## 6. Wichtige Dateien & Ordner

| Pfad | Bedeutung |
|------|-----------|
| **version.json** | Zentrale Versionsnummer (major, minor, patch, build, lastUpdated). |
| **lib/version.ts** | Anzeige in der App (APP_VERSION, BUILD_INFO). |
| **public/version.json** | Für Update-Check; wird bei Build/version:sync geschrieben. |
| **scripts/increment-version.js** | Erhöht Build, schreibt version.json, lib/version.ts, public/version.json. |
| **scripts/sync-version-public.js** | Kopiert version.json → public/version.json (ohne Erhöhung). |
| **scripts/clean-android-builds.js** | Löscht alle Android-Build-Ordner, stoppt Gradle. |
| **scripts/run-android-bs.js** | Startet die App auf BlueStacks. |
| **scripts/embed-icon-svg.js** | Erzeugt public/icon.svg aus FamiDo Task  LOGO-2.png. |
| **scripts/copy-splash-from-logo.js** | Kopiert FamiDo Task  LOGO-2.png → android/…/drawable/splash.png. Aufruf: `npm run android:splash`. |

---

## 7. Kurz-Checkliste vor Release

- [ ] **version.json** und **lib/version.ts** auf neue Version gesetzt (major/minor/patch + build).
- [ ] **`npm run version:sync`** ausgeführt.
- [ ] **`npm run build`** oder **`npm run export`** (für Android: **`npm run mobile:build`** oder **`npm run mobile:update`**).
- [ ] Für Android: **`npm run android:clean`**, dann in Android Studio bauen bzw. **`npm run android:bs`** / **`npm run android:pixel9`** testen.
DB pass/ MhEEmaXRMC6vf0ov/

---

*Letzte Aktualisierung der Doku: Februar 2026.*

