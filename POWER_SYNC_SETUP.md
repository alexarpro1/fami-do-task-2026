# PowerSync + Supabase – Offline-First (Phase 1 & 2)

Die App nutzt **PowerSync** für Offline-First mit Cloud-Sync gegen **Supabase**.  
Technologie: **Next.js (Web) + Capacitor** – kein React Native/Expo. Das PowerSync **Web SDK** läuft im Browser und in der Capacitor-WebView.

---

## Phase 2: SSR-sichere Initialisierung & Context

### lib/db/setup.ts

- **setupPowerSync()** – erstellt asynchron eine `PowerSyncDatabase`-Instanz (Schema aus Phase 1), verbindet den `SupabaseConnector` und gibt die Instanz zurück. Keine Erstellung auf Modulebene, damit Next.js Build/SSR nicht auf wa-sqlite/WASM zugreift.
- **getPowerSyncInstance()** – gibt die aktuelle Instanz oder `null` zurück.

### context/PowerSyncProvider.tsx (`"use client"`)

- Initialisiert PowerSync **nur im Browser** per `useEffect` (prüft implizit `typeof window !== 'undefined'`).
- Zeigt einen **Fallback** (Spinner), solange die DB lädt; bei Fehler eine Fehlermeldung.
- Wenn die DB bereit ist: **PowerSyncContext.Provider** mit der Instanz, darunter `children`.
- **usePowerSync()** – Hook für die DB-Instanz (null, wenn noch nicht geladen oder außerhalb des Providers).
- **usePowerSyncStatus()** – optional: `{ isLoading, error, db }`.

### Einbindung in app/layout.tsx

`PowerSyncProvider` ist bereits eingebunden (innerhalb von `FamilyProvider`):

```tsx
<ErrorBoundary>
  <FamilyProvider>
    <PowerSyncProvider>
      <ThemeApplier />
      <LanguageHtmlWrapper />
      <UpdateAvailableBanner />
      {children}
    </PowerSyncProvider>
  </FamilyProvider>
</ErrorBoundary>
```

Eigene Fallback-UI beim Laden (z. B. Vollbild-Spinner):

```tsx
<PowerSyncProvider fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
  {children}
</PowerSyncProvider>
```

---

## 1. PowerSync-Schema

- **Datei:** `lib/db/schema.ts`
- Tabelle `tasks` mit u. a. `created_at`, `title`, `is_completed`, `assigned_to`, `points` (plus optionale Felder).
- Die Spalte `id` wird von PowerSync automatisch ergänzt.
- Sync Rules im [PowerSync-Dashboard](https://dashboard.powersync.com/) müssen zu diesen Tabellen/Spalten passen.

---

## 2. Supabase-Connector

- **Datei:** `lib/sync/SupabaseConnector.ts`
- Implementiert den PowerSync-Backend-Connector:
  - **fetchCredentials()** – liefert PowerSync-URL und JWT (Supabase Session oder Dev-Token).
  - **uploadData(database)** – liest CRUD-Batches von der lokalen DB und schreibt sie per Supabase-Client in eure Postgres-Tabelle `tasks`.

**Umgebungsvariablen:**

| Variable | Bedeutung |
|----------|-----------|
| `NEXT_PUBLIC_POWERSYNC_URL` | PowerSync Service URL (z. B. von PowerSync Cloud) |
| `NEXT_PUBLIC_POWERSYNC_DEV_TOKEN` | Optional: Dev-Token aus dem PowerSync-Dashboard (für lokale Entwicklung ohne Auth) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Bereits vorhanden |

---

## 3. NPM-Pakete installieren

Im Projektroot:

```bash
npm install @powersync/web @journeyapps/wa-sqlite
```

**Hinweis:** `@supabase/supabase-js` ist bereits im Projekt. Für PowerSync Web wird **kein** `expo-sqlite` benötigt (nur bei React Native/Expo).

Optional (für React-Hooks und Live-Queries):

```bash
npm install @powersync/react
```

---

## Nächste Schritte (nach Phase 1)

1. **PowerSync-Dienst** einrichten (PowerSync Cloud oder Self-Hosted) und mit eurer Supabase-Datenbank verbinden.
2. **Sync Rules** im PowerSync-Dashboard definieren (welche Tabellen/Spalten synchronisiert werden).
3. **Supabase-Tabelle `tasks`** anlegen (Spalten an `lib/db/schema.ts` anpassen, ggf. mit Migration).
4. ~~PowerSync-Datenbank instanziieren~~ – erledigt in Phase 2: `setupPowerSync()` + `PowerSyncProvider` in `app/layout.tsx`.
5. UI schrittweise von lokalem State (z. B. Context) auf Lesen/Schreiben über die PowerSync-DB umstellen (z. B. `usePowerSync()` → `db.getAll()`, `db.watch()`).
