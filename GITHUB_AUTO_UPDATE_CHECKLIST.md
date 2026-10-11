# GitHub Auto-Update (ohne Play Store) – Merkliste

Diese Datei ist deine **"nicht vergessen"-Checkliste**.

## 1) Was schon eingerichtet ist

- Workflow: `.github/workflows/android-apk-release.yml`
- Build + Release laufen automatisch bei Push auf `main` oder manuell per `workflow_dispatch`.
- Es wird immer veroeffentlicht:
  - `FamiApp-<version>.apk`
  - `FamiApp-latest.apk` (stabiler Name)
  - `version.json` inkl. `apkUrl`, `apkSha256`, `publishedAt`, `version`

## 2) Einmalig in GitHub Secrets setzen

In GitHub: `Settings -> Secrets and variables -> Actions`

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

**Wichtig:** Immer denselben Keystore verwenden. Android lehnt Updates mit anderer Signatur ab.

## 3) Keystore in Base64 umwandeln (Windows PowerShell)

Im Projektordner oder mit absolutem Pfad:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Pfad\zu\famiapp-release-key.jks")) | Set-Clipboard
```

Dann direkt in GitHub bei `ANDROID_KEYSTORE_BASE64` einfuegen.

## 4) Feste Update-Links (Defaults im Code)

Repo: `alexarpro1/fami-do-task-2026`

APK (immer neueste):

`https://github.com/alexarpro1/fami-do-task-2026/releases/latest/download/FamiApp-latest.apk`

version.json (Update-Check):

`https://github.com/alexarpro1/fami-do-task-2026/releases/latest/download/version.json`

Optional als Env (Build-Zeit, Capacitor/Next):

```
NEXT_PUBLIC_APP_UPDATE_DOWNLOAD_URL=https://github.com/alexarpro1/fami-do-task-2026/releases/latest/download/FamiApp-latest.apk
NEXT_PUBLIC_VERSION_CHECK_URL=https://github.com/alexarpro1/fami-do-task-2026/releases/latest/download/version.json
NEXT_PUBLIC_UPDATE_ALLOWED_HOSTS=github.com,objects.githubusercontent.com,release-assets.githubusercontent.com
```

Ohne Env greifen dieselben GitHub-Defaults in `lib/version.ts` / `lib/update-security.ts`.
Kein Google-Drive-Ordner mehr als Default.

## 5) Sicherheit (Client)

- Nur **HTTPS**; `http://` wird abgelehnt
- **Host-Allowlist** fuer Check- und Download-URLs
- Manifest muss Schema erfuellen; fremde `apkUrl` werden verworfen
- Supabase `app_updates`: nur Force / `min_required_version`; `download_url` nur bei Allowlist-Match
- Sideload: Nutzer installiert manuell; PackageManager prueft Signatur

Unit-Tests: `npm run test:update-security`

## 6) Release ausloesen

Option A (automatisch):

- Auf `main` pushen.

Option B (manuell):

- GitHub -> `Actions` -> `Android APK Release` -> `Run workflow`.

## 7) Ergebnis pruefen

Lokal (schnell):

```powershell
npm run verify:update-urls
```

- GitHub -> `Releases` oeffnen
- `FamiApp-latest.apk` und `version.json` vorhanden
- In `version.json`: `apkSha256` und `apkUrl` gesetzt
- Release-Body enthaelt den SHA-256-Hash
- In der App: **Update pruefen** (version-badge) -> Toast; **Jetzt updaten** oeffnet Allowlist-APK-URL (Capacitor `Browser.open`)

## 8) Auto-Update-Verhalten (installierte APK)

Android kann Sideload-APKs **nicht still** ueberschreiben – die App macht das Naechstmoegliche:

- Bei **Cold Start** und **Resume** (`appStateChange` / Visibility): sicherer `version.json`-Check (GitHub).
- **APK:** `CapacitorHttp` (kein WebView-CORS). Browser: Fallback ueber `api.github.com/releases/latest`.
- Debounce: Resume nur wenn letzter Check **> 1h**; spaetestens alle **24h** erneut.
- Neue Version: Banner + Soft-Prompt ("Jetzt updaten", einmal pro Remote-Version).
- Force / `min_required_version` (Supabase): blockierendes Modal; Download **einmal** auto-oeffnen (Allowlist-URL).
- Persistenz in `localStorage`: last-check, last-notified, last-auto-opened, soft-dismissed.

## 9) Wichtig zu wissen

- Ohne Play Store ist die **Installation** nicht still/automatisch (Nutzer muss bestaetigen).
- **Build + Veroeffentlichung** sind automatisiert und signiert.
- Drive-Ordner ist kein vertrauenswuerdiger Update-Kanal mehr.

## 10) 404 auf Update-Links – Ursachen

Die App zeigt korrekte **GitHub-Release-URLs** (`lib/update-security.ts`). **404** heisst fast immer:

1. **Repo fehlt oder ist nicht erreichbar** – `git ls-remote origin` / `https://github.com/alexarpro1/fami-do-task-2026` liefert „Not Found“. Repo auf GitHub anlegen, `origin` pushen (mind. `main`).
2. **Noch kein Release** – `/releases/latest/download/*` existiert erst nach dem **ersten** Release mit Assets `FamiApp-latest.apk` und `version.json` (Workflow `Android APK Release` oder manuell).
3. **Privates Repo** – oeffentliche Download-Links funktionieren nur, wenn Releases oeffentlich sind; API ohne Token liefert ebenfalls 404.

**Nicht** die Ursache: falsche Pfade im Code (Defaults stimmen mit dieser Checkliste ueberein). Alte **Google-Drive-Links** in der App werden durch die Allowlist blockiert – `npm run apk:sync-drive` ist nur Backup.

### Erstes Release / Version 2.6.2.0 manuell

Wenn CI noch nicht lief oder Secrets fehlen:

1. Release-APK lokal bauen (signiert, gleicher Keystore wie bisher): z. B. `npm run apk:release` (Version steht in `version.json`, aktuell **2.6.2.0**).
2. `public/version.json` nach `version.json` fuer Upload vorbereiten und Felder setzen (wie im Workflow):
   - `version`: `2.6.2.0`
   - `apkUrl`: `https://github.com/alexarpro1/fami-do-task-2026/releases/latest/download/FamiApp-latest.apk`
   - `apkSha256`: SHA-256 der APK (`certutil -hashfile FamiApp-latest.apk SHA256` unter Windows)
   - `publishedAt`: ISO-Zeitstempel
3. GitHub -> **Releases** -> **Draft a new release** (oder Workflow `Android APK Release` mit Secrets aus Abschnitt 2).
4. Assets hochladen: **`FamiApp-latest.apk`**, **`version.json`**, optional `FamiApp-2.6.2.0.apk`.
5. Release **veroeffentlichen** (nicht Draft) – sonst liefert `releases/latest` weiter 404.
6. `npm run verify:update-urls` muss OK sein, danach in der APK **Update pruefen**.

**Hinweis CI:** Der Workflow fuehrt `npm run version:update` aus und **erhoeht die Build-Nummer** vor dem APK-Build. Fuer exakt **2.6.2.0** entweder manuelles Release (oben) oder `version.json`/`lib/version.ts` vor dem Push so setzen, dass nach Bump die gewuenschte Version herauskommt.
