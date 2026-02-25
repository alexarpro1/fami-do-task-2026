# FamiApp Changelog

## [2.2.0.285] - 2025-12-30

### Integer Overflow Fix & Stabile Synchronisierung

**Build 285** - KRITISCHER FIX: Integer Overflow behoben, stabiler Cloud-Sync

#### Kritische Fixes

##### 1. INTEGER OVERFLOW FIX (WICHTIGSTER FIX)
- **Problem**: `Date.now()` (Millisekunden seit 1970) ist zu groß für PostgreSQL Integer (max 2.147.483.647)
- **Fehler**: `out of range for type integer` beim Hochladen in `family_data.version`
- **Lösung**: Einfacher Versionszähler statt Millisekunden
  - `versionCounter` startet bei 0 und erhöht sich bei jedem Push um +1
  - Wird beim Pullen aktualisiert: `versionCounter = data.version + 1`
  - Bleibt innerhalb des Integer-Bereichs (max ~2 Milliarden Versionen)
- **Console-Log**: `[WLAN-DEBUG] Data pushed successfully with version: [nummer]`

##### 2. Automatischer Version-Sync
- Beim ersten `pullData()` wird `versionCounter` auf `data.version + 1` gesetzt
- Verhindert Konflikte wenn mehrere Geräte pushen
- Jedes Gerät hat seinen eigenen inkrementellen Zähler
- Cloud behält immer die höchste Version

##### 3. PeerJS Stabilität - Keine vorzeitigen Stopps
- **device-sync-panel.tsx**: useEffect Cleanup nur wenn `persistentConnection === false`
- PeerJS Manager bleibt aktiv solange "Dauerhafte Verbindung" ON ist
- Kein `stopDiscovery()` mehr bei jedem Re-Render
- Manager wird nur beim Umschalten auf OFF oder Component-Unmount gestoppt
- Fix: `return () => { if (!persistentConnection) { wifiManagerRef.current?.stopDiscovery() } }`

##### 4. Initial Cloud-Push beim Start (bereits in Build 285)
- `pushCurrentState()` Methode für initialen Daten-Upload
- Beim Start wird nicht nur gepullt, sondern auch einmalig gepusht
- Andere Geräte finden sofort Daten beim ersten Poll
- `lastPushedData` wird gesetzt um doppelte Pushes zu vermeiden
- Console-Log zeigt: `[WLAN-DEBUG] Pushing current state as master...`

##### 5. Status-Anzeige mit Master Upload Button
- Nach Cloud-Sync Start: 2 Sekunden warten auf Daten
- Falls keine Daten gefunden: Amber Alert-Box mit "Meinen Stand jetzt als Master hochladen"
- Button ruft `pushAsMaster()` auf - uploaded State in DB
- Nach erfolgreichem Upload: Grüne Success-Box "Sync-Daten verfügbar"
- Nur im Cloud-Sync Modus verfügbar (nicht PeerJS)

#### Technische Details

##### WifiSyncManager Updates
- **Neues Feld**: `versionCounter: number = 0`
- **pushCurrentState(data)**: 
  - Inkrementiert `versionCounter++`
  - Verwendet `versionCounter` statt `Date.now()`
  - Console-Log: `Data pushed successfully with version: [nummer]`
- **broadcast(data)**: 
  - Inkrementiert `versionCounter++`
  - Skip Push wenn `dataString === lastPushedData`
  - Verwendet `versionCounter` statt `Date.now()`
- **pullData()**: 
  - Setzt `versionCounter = data.version + 1` nach erfolgreicher Pull
  - Sorgt für konsistente Versionsnummern über alle Geräte
- **pushCurrentState(data)**: Neue public Methode für expliziten Upload
  - Setzt `lastPushedData` und `lastVersion`
  - Console-Log für Debugging
  - Wirft Error bei Fehler (wird von UI gefangen)
- **broadcast(data)**: Prüft ob Data sich geändert hat (`dataString === lastPushedData`)
  - Skip Push wenn keine Änderung
  - Console-Log nur bei tatsächlichem Broadcast
- **pullData()**: Keine Änderungen, funktioniert wie vorher

##### PeerSyncManager Updates
- Keine Änderungen nötig - funktioniert bereits stabil
- `broadcast(data)` sendet an alle offenen Connections
- Silent operation - nur Console-Logs bei tatsächlichem Send

##### DeviceSyncPanel Updates
- **startWifiDiscovery()**: 
  - Cloud-Mode: Nach `startDiscovery()` wartet 2s auf Daten
  - Setzt `hasExistingData` basierend auf `onDataReceived` Callback
  - PeerJS-Mode: Setzt `hasExistingData = true` (immer ready)
- **pushAsMaster()**: 
  - Nur im Cloud-Mode verfügbar
  - Zeigt Toast mit Erfolg/Fehler
  - Setzt `hasExistingData = true` nach Upload
- **useEffect Cleanup**:
  - Nur stopDiscovery wenn `!persistentConnection`
  - Manager bleibt sonst aktiv im Hintergrund

##### Warum ein Zähler statt Millisekunden?
- PostgreSQL Integer: -2.147.483.648 bis +2.147.483.647
- `Date.now()` im Jahr 2025: ~1.735.560.000.000 (zu groß!)
- Zähler ab 0: Reicht für 2+ Milliarden Sync-Events
- Einfacher, verständlicher, funktioniert garantiert

#### Validierung & Defensive Programmierung
- UUID-Validierung vor jedem DB-Zugriff
- Try-catch um alle Supabase-Aufrufe
- Daten-Struktur-Validierung vor `onDataReceived` Callback
- Keine Abstürze bei korrupten Daten

##### UI Verbesserungen
- Amber Alert-Box: "Keine Sync-Daten gefunden" mit Erklärung
- Master Upload Button: Mit Loader während Upload
- Grüne Success-Box: "Sync-Daten verfügbar - Automatische Synchronisierung aktiv"
- Nur sichtbar im Cloud-Sync Modus und wenn `wifiEnabled === true`

#### Vorteile der Implementierung
- ✅ Initial Push verhindert "No data" Situation bei neuen Geräten
- ✅ Stabile Verbindungen durch korrekten Cleanup
- ✅ Auto-Sync mit Debounce verhindert Spam
- ✅ Master Upload gibt Kontrolle zurück an Benutzer
- ✅ Klare Status-Anzeige zeigt ob Daten verfügbar sind

---

## [2.2.0.284] - 2025-12-29

### PeerJS + Database Polling - Dual-Mode Sync

**Build 284** - Alternative Sync-Methode mit PeerJS für direkte Peer-to-Peer Verbindungen

#### Neue Features

##### PeerJS Integration für Direkt-Sync
- **lib/sync/peer-sync.ts**: Neue PeerSyncManager Klasse für P2P-Verbindungen
- Nutzt WebRTC DataChannels für direkte Geräte-zu-Geräte Kommunikation
- Jedes Gerät generiert eine eindeutige Peer-ID basierend auf der Device-ID
- Automatische Verbindung zu bekannten Peers aus QR-Codes
- Google STUN Server für NAT-Traversal

##### Zwei-Wege-Sync-Modus im DeviceSyncPanel
- **Cloud-Sync**: Nutzt Supabase Database Polling (alle 8s) - Stabil und zuverlässig
- **Direkt-Sync**: Nutzt PeerJS für Echtzeit P2P - Schneller, benötigt offene Ports
- Benutzer kann zwischen Modi wechseln (nur wenn Sync gestoppt ist)
- Mode wird in localStorage gespeichert (`famido_sync_mode`)

##### PeerJS Features
- **Discovery via QR**: Peer-IDs werden beim QR-Scan gespeichert und beim Start verbunden
- **Bidirektionale Verbindung**: Eingehende und ausgehende Connections werden behandelt
- **Handshake-System**: Geräte tauschen Namen beim Verbinden aus
- **Data Validation**: Nur valide Daten mit `children` Array werden importiert
- **Auto-Reconnect**: Bei Disconnect versucht Peer automatisch wiederzuverbinden
- **Connection Status**: Zeigt connecting/connected/disconnected Status an

##### Auto-Sync unterstützt beide Modi
- **family-context.tsx**: Auto-Sync nutzt den aktiven Sync-Mode
- Cloud-Mode: `wifiSyncManager.broadcast(state)`
- Direct-Mode: `peerSyncManager.broadcast(state)`
- 2 Sekunden Debounce für beide Modi
- Läuft nur wenn "Dauerhafte Verbindung" aktiviert ist

##### UI-Verbesserungen
- Sync-Modus Toggle-Buttons in device-sync-panel
- Beschreibungstext zeigt Vor- und Nachteile beider Modi
- Kann nur gewechselt werden wenn Sync gestoppt ist
- Mode wird mit Icon visualisiert (Cloud vs. Zap)

#### Technische Details

##### PeerSyncManager Architektur
- Basiert auf PeerJS 1.5.5 Library
- WebRTC DataChannels mit `reliable: true` Flag
- Automatisches Cleanup bei Verbindungsabbruch
- Ping-System über Handshake-Messages
- Discovered Peers Liste mit lastSeen Timestamp

##### Stabilität und Fehlerbehandlung
- Alle PeerJS Fehler werden geloggt mit `[PEER-DEBUG]` Präfix
- Ungültige Daten werden abgelehnt (kein Crash)
- Connection-Timeouts werden behandelt
- Error Events werden zur UI weitergereicht

##### Cross-Device Kompatibilität
- Funktioniert zwischen verschiedenen Geräten (Handy/Tablet)
- Benötigt keine Datenbank für Direktverbindung
- Kann auch über Internet funktionieren (mit korrekter NAT-Config)
- Fallback auf Cloud-Sync wenn P2P nicht funktioniert

---

## [2.2.0.281] - 2025-12-29 (STABLE)

### Defensive Programming + Error Boundary

**Build 281** - App-Abstürze durch Null-Checks und Error Boundary behoben

#### Behobene Fehler

##### Client-Side Application Errors
- **Problem**: App stürzt bei korrupten/fehlenden Daten ab mit weißem Bildschirm
- **Ursache**: Fehlende Null-Checks bei Array-Zugriffen (`state.children.map` ohne Validierung)
- **Lösung**: Defensive Programmierung + React Error Boundary

#### Technische Änderungen

##### Error Boundary Implementation
- **components/error-boundary.tsx**: React Error Boundary Komponente
- Fängt alle unbehandelten Fehler in der App ab
- Zeigt benutzerfreundliche Fehlermeldung statt weißem Bildschirm
- "App zurücksetzen" Button löscht korrupte localStorage-Daten
- Verhindert kompletten App-Crash bei Datenproblemen

##### Family Context - Defensive Programmierung
- **LOAD_STATE**: Validiert geladene Daten, fällt zurück auf INITIAL_STATE bei Fehler
- **IMPORT_STATE**: Prüft ob importierte Daten valide sind bevor sie geladen werden
- Alle Array-Zugriffe nutzen jetzt `(state.children || [])` statt direktem Zugriff
- localStorage-Fehler werden abgefangen und geloggt
- Automatischer Reset bei korrupten Daten

##### Komponenten - Null-Checks
- **app/page.tsx**: `state.children || []` bei allen Array-Operationen
- **components/admin/school-time-settings.tsx**: Null-Check für `state.children`
- **components/child/child-selector-modal.tsx**: Safe Array-Zugriff mit `|| []`
- Alle `.map()`, `.filter()`, `.find()` Aufrufe sind jetzt geschützt

##### Supabase WLAN-Sync - Payload-Validierung
- **lib/sync/wifi-sync.ts**: Prüft ob Supabase-Payload valide ist
- Validiert Message-Struktur (senderId, senderName, type müssen vorhanden sein)
- Prüft ob data-Objekt existiert und valide ist vor Import
- Behandelt CHANNEL_ERROR und TIMED_OUT Status-Events
- Verhindert App-Crash bei ungültigen Supabase-Messages

##### localStorage Recovery
- Fehler beim Laden werden abgefangen
- Korrupte Daten werden automatisch gelöscht
- App startet mit INITIAL_STATE bei Fehlern
- Benutzer sieht Fehlermeldung statt Absturz

#### Sicherheitsverbesserungen
- **Keine unbehandelten Fehler mehr** - Error Boundary fängt alles ab
- **Automatische Daten-Recovery** - Korrupte Daten werden erkannt und entfernt
- **Graceful Degradation** - App funktioniert auch mit fehlenden Daten
- **Benutzerfreundliche Fehlermeldungen** - Klare Anweisungen statt weißem Bildschirm

#### WLAN-Sync Status
- Supabase Realtime Broadcast aktiviert für Cross-Device Kommunikation
- Payload-Validierung verhindert Abstürze bei fehlerhaften Messages
- Automatisches Cleanup von stale Devices alle 10 Sekunden
- Ping-System alle 3 Sekunden für Device-Discovery

---

## [2.2.0.280] - 2025-12-29

### Persistente Verbindung + Auto-Sync Loop

**Build 280** - Dauerhafte WLAN-Verbindung mit automatischer Synchronisierung

#### Neue Features

##### Persistent Storage für dauerhafte Verbindung
- localStorage Key: `famido_persistent_sync`
- Wird beim Start geladen und beim Toggle gespeichert
- Startet Discovery automatisch wenn aktiviert

##### Auto-Sync Hintergrund-Loop
- Synchronisiert State bei Änderungen automatisch
- 2 Sekunden Debounce um Netzwerk nicht zu überlasten
- Nutzt `wifiSyncManager.broadcast(state)` für alle verbundenen Geräte
- Läuft nur wenn `persistentConnection === true`

##### QR-Import Crash-Schutz
- IMPORT_STATE validiert vollständig ob `children` ein Array ist
- Falls nicht: `console.error` und `return state` (kein Crash)
- Alle erforderlichen Felder werden mit Defaults befüllt

---

## [2.2.0.269] - 2025-12-29 (STABLE)

### Supabase Authentication behoben

**Build 269** - "Invalid API key" Fehler behoben durch korrekte Environment-Variable Verwendung

#### Behobene Fehler

##### Supabase "Invalid API key" Error
- **Problem**: Gehärtete/falsche API-Keys im Code statt Environment-Variablen
- **Ursache**: `lib/supabase/client.ts` und `lib/supabase/server.ts` verwendeten Fallback-Keys
- **Lösung**: Alle Supabase-Clients verwenden jetzt nur Environment-Variablen
- **Betroffene Dateien**: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/sync/supabase-client.ts`

#### Technische Änderungen

##### Supabase Client-Refactoring (Best Practices)
- **lib/supabase/client.ts**: Factory-Funktion `createClient()` statt Singleton
- **lib/supabase/server.ts**: Factory-Funktion `createClient()` mit Cookie-Management
- **lib/sync/supabase-client.ts**: Nutzt zentrale `createClient()` Funktion
- **lib/family-sync.ts**: Aktualisiert auf neue Client-Erstellung
- **lib/sync/wifi-sync.ts**: Aktualisiert auf neue Client-Erstellung

##### Vorteile der neuen Struktur
- Kompatibel mit Vercel Fluid Compute (keine globalen Variablen)
- Sichere Environment-Variable Nutzung (keine gehärteten Keys)
- Konsistente Client-Erstellung über die gesamte App
- Automatisches Cookie-Management für Auth
- Einfachere Fehlersuche und Debugging

##### Environment-Variablen
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anonymous/Public Key
- Beide werden automatisch von Vercel bereitgestellt bei Supabase-Integration

#### QR-Code & WLAN-Sync Status
- QR-Code-Sync sollte jetzt funktionieren (Token-Upload zu Supabase)
- WLAN-Sync sollte jetzt Geräte finden können (Supabase Realtime)
- Automatische Wiederverbindung bei Verbindungsverlust aktiv

#### Nächste Schritte
- Teste QR-Code Generierung und Scan
- Teste WLAN-Geräte-Erkennung
- Prüfe Debug-Logs für weitere Fehler

---

## [2.2.0.268] - 2025-12-29 (STABLE)

### QR-Code Sync über Supabase behoben

**Build 268** - QR-Code funktioniert jetzt mit Supabase-Backend für große Datenmengen

#### Behobene Fehler

##### QR-Code "code length overflow" Error
- QR-Code war zu groß (105KB) für direkte Einbettung
- Lösung: Daten werden in Supabase-Tabelle `sync_tokens` gespeichert
- QR-Code enthält nur noch kleinen 8-Zeichen Token (ca. 15 bytes)
- Token ist 10 Minuten gültig und läuft dann automatisch ab
- Automatische Bereinigung abgelaufener Tokens

#### Technische Implementation

##### Neue Supabase-Tabelle
- `sync_tokens` Tabelle für temporären Daten-Speicher
- Felder: token, device_id, device_name, data (JSONB), expires_at
- RLS Policies für sichere Lese/Schreib-Operationen
- Automatische Cleanup-Funktion für abgelaufene Tokens
- Indizes für schnelle Token-Suche

##### Sync-Manager Überarbeitung
- `lib/sync/supabase-client.ts` - Singleton Supabase Client für Sync
- Token-Generierung mit 8 zufälligen Zeichen (A-Z, a-z, 2-9)
- Upload der Daten zu Supabase beim QR-Generieren
- Download der Daten von Supabase beim QR-Scannen
- Automatische Token-Löschung nach Import

##### Ablauf
1. Gerät A: Erstellt Token → Speichert Daten in Supabase → QR mit Token
2. Gerät B: Scannt QR → Liest Token → Lädt Daten von Supabase
3. Import der Daten in Gerät B
4. Token wird automatisch gelöscht

#### Vorteile
- Unbegrenzte Datengröße (nur durch Supabase limitiert)
- Sicherer als lokaler Storage (RLS Policies)
- Automatische Bereinigung alter Tokens
- Konsistentes Sync-Erlebnis
- QR-Code bleibt klein und scannbar

#### WLAN-Sync Status
- WLAN-Sync wurde mit Supabase Realtime implementiert
- Automatische Wiederverbindung bei Verbindungsverlust
- Dauerhafte Verbindung Toggle für persistenten Sync
- Status-Anzeige mit "Verbinde..." bei Reconnect

#### Nächste Schritte
- WLAN-Sync im Live-Einsatz testen
- Google Drive OAuth vollständig testen
- Auto-Sync für Cloud implementieren (später)

---

## [2.2.0.231] - 2025-12-29 (STABLE)

### Google Drive OAuth-Integration behoben

**Build 231** - Echte Google Drive Anbindung mit korrekter redirect_uri Konfiguration

#### Behobene Fehler

##### Google Drive OAuth "redirect_uri_mismatch" Error (Fehler 400)
- Redirect-URI korrekt in OAuth-Flow integriert
- `ux_mode: "redirect"` für stabile OAuth-Weiterleitung
- `redirect_uri` basiert auf aktuellem Origin + `/admin`
- OAuth-Callback-Handling in `app/admin/page.tsx` hinzugefügt
- Session-Storage für Access-Token und Account-Info

##### Setup-Dokumentation hinzugefügt
- `GOOGLE_DRIVE_SETUP.md` mit Schritt-für-Schritt Anleitung erstellt
- Erklärt Google Cloud Console Konfiguration
- Autorisierte JavaScript-Ursprünge und Weiterleitungs-URIs
- Fehlerbehebung für redirect_uri_mismatch
- Deutsche Sprache für bessere Verständlichkeit

#### Technische Verbesserungen
- `getRedirectUri()` Funktion für dynamische URI-Erkennung
- Google Identity Services Library mit korrektem redirect_uri
- OAuth-Callback wird automatisch beim Seitenladen verarbeitet
- Stored Account wird aus sessionStorage wiederhergestellt
- Verbesserte Fehlerbehandlung und Logging

#### Google Drive API Features
- Upload zu Google Drive mit Ordner-Erstellung
- Download von letztem Backup aus Google Drive
- Automatische FamiDo-Ordner-Verwaltung
- Token-Revoke beim Trennen der Verbindung
- Vollständige CRUD-Operationen für Backups

#### WLAN-Sync Status
- WLAN-Sync wurde mit Supabase Realtime implementiert
- Automatische Wiederverbindung bei Verbindungsverlust
- Dauerhafte Verbindung Toggle für persistenten Sync
- Status-Anzeige mit "Verbinde..." bei Reconnect

#### Nächste Schritte
- WLAN-Sync im Live-Einsatz testen
- Google Drive OAuth vollständig testen
- Auto-Sync für Cloud implementieren (später)

---

## [2.2.0.230] - 2025-12-27 (STABLE)

### WLAN-Synchronisierung aktiviert

**Build 230** - Vollständiges WLAN-Sync mit Geräte-Erkennung und Daten-Übertragung

#### Neue Features

##### WLAN-Synchronisierung (AKTIV)
- WLAN-Tab in Device-Sync-Panel aktiviert
- Geräte-Suche im lokalen Netzwerk
- Automatische Geräte-Erkennung über BroadcastChannel API
- WebRTC-basierte Peer-to-Peer Verbindung
- Visuelle Status-Anzeige (Scanning-Animation, verbundene Geräte)
- Direkte Daten-Übertragung zwischen Geräten
- Gerät verbinden/trennen Funktionalität
- Sync-Button für manuelle Daten-Übertragung

##### WLAN-Sync UI
- Gefundene Geräte Liste mit Gerätename und ID
- Verbundene Geräte Liste mit grüner Hervorhebung
- "Nach Geräten suchen" / "Suche stoppen" Toggle
- Radio-Icon-Animation während Scan
- Geräte-Info Anzeige (Name, ID-Preview)
- Status-Badge für verbundene Geräte

##### Technische Implementation
- `lib/sync/wifi-sync.ts` - WiFiSyncManager mit WebRTC
- BroadcastChannel für lokale Geräte-Kommunikation
- RTCPeerConnection für stabile Verbindungen
- RTCDataChannel für Daten-Übertragung
- Automatische Geräte-Discovery alle 3 Sekunden
- Cleanup bei Component-Unmount

#### UI/UX Verbesserungen
- WLAN-Tab nicht mehr disabled
- Klare visuelle Trennung zwischen gefundenen und verbundenen Geräten
- Direkte Verbinden/Senden Buttons
- Kompakte Geräte-Karten mit allen wichtigen Infos
- Responsive Layout für Mobile und Tablet

#### Sync-Methoden Überblick
1. **QR-Code** - Schnell, offline, für einmaligen Sync
2. **WLAN** - Automatisch, lokal, für regelmäßigen Sync zu Hause (NEU AKTIV)
3. **Cloud** - Remote, überall, für Notfall-Backups

---

## [2.2.0.229] - 2025-12-27 (STABLE)

### Vollständiges Geräte-Synchronisations-System

**Build 229** - Multi-Device Sync mit QR-Code, lokales WLAN und Cloud-Backup

#### Neue Features

##### Device-ID Management
- Hardware-basierte Device-ID mit UUID-Fallback
- Automatische Geräte-Identifikation über Capacitor
- Persistente Speicherung in Capacitor Preferences
- Geräte-Name anpassbar für bessere Übersicht

##### QR-Code Synchronisierung
- QR-Code-Generierung mit Sync-Token (klein, < 100 bytes)
- Funktionierender QR-Scanner mit Kamera-Zugriff
- Vollständiger Daten-Import vom anderen Gerät
- Token-basiertes System mit 5-Minuten-Ablauf
- Automatische Token-Bereinigung

##### Cloud-Sync System
- Multi-Account-Unterstützung (Google Drive, Dropbox, OneDrive vorbereitet)
- Cloud-Sync Ein/Aus Toggle
- Manuelles Backup hochladen/herunterladen
- Speicherort-Anzeige (E-Mail, Ordner-Pfad)
- Letzter Sync-Zeitstempel
- Konto wechseln und verwalten

##### Modulare Sync-Architektur
- `lib/sync/types.ts` - TypeScript Typen für Sync-System
- `lib/sync/manager.ts` - Zentrale Sync-Verwaltung
- `lib/sync/google-drive.ts` - Google Drive Integration (vorbereitet)
- `components/admin/device-sync-panel.tsx` - Admin-UI mit Tabs

##### Admin-Panel Integration
- Neue Sektion "Geräte-Synchronisation" in Einstellungen
- 3 Tabs: QR-Code, WLAN (vorbereitet), Cloud
- Geräte-Info-Karte mit ID und Name
- Aufklappbare Sections für kompakte Darstellung

#### Technische Details
- QR-Code Scanner verwendet `html5-qrcode` Library
- Vollbild-Overlay mit Kamera-Vorschau
- Token-Storage in localStorage mit Expiry
- SyncManager als Singleton-Pattern
- IMPORT_STATE Action für Daten-Import

#### Geplant für später
- Lokales WLAN-Sync (Peer-to-Peer)
- Auto-Sync für Cloud (aktuell nur manuell)
- Bluetooth-Sync für unterwegs
- Konflikt-Erkennung bei gleichzeitigen Änderungen

---

## [2.2.0.220] - 2025-12-27 (STABLE)

### Theme-System vollständig repariert

**Build 220** - Kritischer Bugfix für Theme-Wechsel

#### Behobene Fehler
- Theme-Wechsel funktioniert jetzt wieder korrekt
- Alle 8 Theme-CSS-Klassen hinzugefügt (theme-sunrise, theme-meadow, etc.)
- tw-animate-css Import endgültig aus globals.css entfernt
- CSS lädt jetzt korrekt und blockiert nicht mehr

#### Technische Details
- CSS-Klassen für alle Themes implementiert: Sunrise, Meadow, Bubblegum, Aqua, Midnight, Volcanic, Forest, Cosmic
- Vollständige CSS-Variablen für jeden Theme-Modus
- ThemeApplier funktioniert jetzt korrekt mit allen Theme-Klassen

---

## [2.2.0] - 2025-01-27 (STABLE)

### Stabile Release - Optimiert für Tablets & Smartphones

Diese Version ist eine stabile, produktionsreife Release ohne Beta-Features.
Das Familien-Sync System wurde für zukünftige Entwicklung archiviert.

#### Mobile & Tablet Optimierungen
- Aufklappbare Sidebar für Tablets und Smartphones (statt permanent sichtbar)
- Sidebar als Offcanvas-Drawer implementiert
- Mobile-Breakpoint auf 1024px erhöht (alle Tablets nutzen jetzt Mobile-UI)
- Text-Selektion app-weit deaktiviert (verhindert ungewolltes Kopieren)
- Touch-optimierte Bedienung
- Bessere Platzverhältnisse auf kleinen Displays

#### PWA Installation
- Android: Installierbar als Progressive Web App über Browser
- iOS: Installierbar über Safari → "Zum Home-Bildschirm hinzufügen"
- Offline-Funktionalität
- App-Icon und Splash-Screen
- Vollbild-Modus

#### Verbesserungen
- CSS-Fehler mit tw-animate-css komplett behoben
- Performance-Optimierungen für mobile Geräte
- Stabilere Offline-Funktionalität
- Reduzierte Bundle-Größe
- **Familien-Sync (BETA) in Beta-Archiv verschoben**

#### Beta-Archiv
Das Familien-Sync System wurde in das `beta-archive/` Verzeichnis verschoben:
- Alle Family-Sync Komponenten archiviert
- Datenbank-Schemas archiviert
- Dokumentation für zukünftige Entwicklung erhalten
- Stabile Version fokussiert auf Backup/Restore für Daten-Sharing

#### Bekannte Einschränkungen (iOS)
- iOS Cache-Limit: 7 Tage Offline-Nutzung
- Keine Push-Notifications auf iOS
- Installation nur über Safari möglich (Chrome funktioniert nicht)

#### Für Entwickler
- Capacitor 6.2.0 für Android APK Build
- Next.js 16.0.10
- React 19.2.0
- Tailwind CSS 4.1.9
- Keine tw-animate-css Abhängigkeit mehr

---

## [2.0.0-beta] - 2025-01-XX (ARCHIVED)

### BETA - Familien-Sync System (Im Beta-Archiv für zukünftige Entwicklung)

**Status: Diese Features wurden ins `beta-archive/` Verzeichnis verschoben.**

Das Familien-Sync System wird in einer zukünftigen Version als ausgereiftes Feature
zurückkehren. Die aktuelle stabile Version (2.2.0) fokussiert sich auf Stabilität
und mobile Optimierung.

#### Archivierte Features

##### Familien-Sync (BETA)
- Multi-Geraete Synchronisierung über Supabase
- Familie erstellen mit einzigartigem Code (8 Zeichen)
- Familie beitreten durch Code-Eingabe
- Master-Admin Rolle für Eltern (alle Rechte)
- Kind-Rolle für eingeschränkte Ansicht
- Automatische Synchronisierung bei Änderungen
- Offline-Support mit automatischem Sync wenn online
- Geraete-Verwaltung (Geraete anzeigen/entfernen)
- Sync-Status Anzeige (Online/Offline/Sync)

##### Archivierte Dateien
- `beta-archive/components/family-sync-panel.tsx`
- `beta-archive/components/qr-code-display.tsx`
- `beta-archive/lib/family-sync.ts`
- `beta-archive/scripts/001-create-family-sync-tables.sql`
- `beta-archive/scripts/002-improve-sync-schema.sql`
- `beta-archive/README.md` - Vollständige Dokumentation

##### Alternative für Daten-Sharing (Stabil)
- Backup/Restore System unter Einstellungen
- Export als JSON-Datei
- Sharing via WhatsApp, Email, etc.
- Import von geteilten Backups

#### Nächste Schritte (geplant für v3.0)
- Echtzeit-Sync mit Supabase Realtime
- QR-Code Scanner für einfaches Beitreten
- Push-Benachrichtigungen bei Remote-Änderungen
- Erweiterte Konflikt-Lösung
- Offline-Queue für Änderungen
- Verschlüsselte End-to-End Kommunikation

---

## [1.5.0] - 2025-01-XX

### Neue Features

#### Level-System
- 10 Level mit Titeln und Emojis (Anfänger bis Legende)
- Fortschrittsbalken zum nächsten Level
- Level-Karte auf Startseite mit aktuellem Status
- Automatische Level-Berechnung basierend auf Gesamt-Punkten

#### Streak-System
- Tage-Zähler für aufeinanderfolgende Tage mit erledigten Aufgaben
- Aktueller Streak und Rekord-Anzeige
- Streak-Badge auf Startseite mit Flammen-Animation
- Automatische Streak-Berechnung bei Aufgaben-Abschluss
- Streak bricht ab wenn ein Tag ohne Aufgabe vergeht

#### Achievements/Abzeichen
- 16 freischaltbare Achievements in 4 Kategorien:
  - Streak-Achievements (3, 7, 14, 30 Tage)
  - Aufgaben-Achievements (10, 50, 100, 500 erledigt)
  - Punkte-Achievements (100, 500, 1000, 5000 gesammelt)
  - Shop-Achievements (1, 10, 25 Einkäufe)
- Automatische Freischaltung bei Erreichen
- Achievements-Tab in Profil-Seite
- Fortschrittsbalken für noch nicht freigeschaltete
- Bronze/Silber/Gold/Platin Stufen

#### Wunschliste
- Herz-Button im Shop zum Hinzufügen (max. 3 Items)
- Wunschliste-Karte auf Startseite
- Fortschrittsbalken zeigt wie viel noch fehlt
- Direkter Kauf-Button wenn genug Punkte
- Entfernen aus Wunschliste möglich

#### Wochen-Zusammenfassung
- Statistik der letzten 7 Tage
- Erledigte Aufgaben, verdiente Punkte, aktiver Streak
- Tages-Balken-Diagramm
- Übersicht in Profil-Seite

#### Eltern-Benachrichtigungen
- Benachrichtigung bei Aufgaben-Erledigung
- Tages-Zusammenfassung zu einstellbarer Uhrzeit
- Ein/Ausschaltbar in Einstellungen
- Zeigt Kind-Name, Aufgabe und Punkte

### Behobene Fehler

#### Mood-History
- Null-Prüfung für moodEntries hinzugefügt
- Verhindert "Cannot read properties of undefined" Fehler

### Technische Verbesserungen
- Child-Type erweitert (level, streak, longestStreak, lastActiveDate, wishlist, achievements, totalTasksCompleted)
- Achievement-Type mit id, title, description, icon, category, requirement, progress, unlockedAt
- LEVELS und ACHIEVEMENTS Konstanten in lib/constants.ts
- getChildLevel und getChildAchievements Helper-Funktionen
- UPDATE_STREAK und UNLOCK_ACHIEVEMENT Actions im Context
- StreakBadge, AchievementCard, WeeklySummary, LevelBadge, WishlistCard Komponenten
- Profil-Seite mit Tabs (Übersicht, Abzeichen, Verlauf)
