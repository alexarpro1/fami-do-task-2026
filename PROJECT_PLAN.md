# FamiApp - Projektplan

## 📊 Aktueller Stand (Version 2.2.0.285)

### ✅ Implementierte Features

#### Kern-Funktionalität
- ✅ Multi-Child Profile Management
- ✅ Aufgaben-System mit Kategorien, Zeitfenstern, Wiederholungen
- ✅ Belohnungs-Shop mit Wunschliste
- ✅ Verhaltens-Regeln (Schnell-Regeln)
- ✅ Punkte-System mit Leveln (10 Level)
- ✅ Streak-System (Tage in Folge)
- ✅ Achievements/Abzeichen (16 Achievements)
- ✅ Virtual Pet System
- ✅ Sticker-Album
- ✅ Mood-Tracking
- ✅ Wetter-Widget
- ✅ Timer-System (Focus Timer, Visual Timer, Mini Timer)
- ✅ Schulzeit-Sperre
- ✅ Wochen-Zusammenfassung

#### Sync & Backup
- ✅ QR-Code Synchronisierung (Token-basiert über Supabase)
- ✅ WLAN-Sync (Cloud-Mode: Supabase Polling, Direct-Mode: PeerJS P2P)
- ✅ Google Drive Backup/Restore
- ✅ Manueller Export/Import (JSON)
- ✅ Automatische Synchronisierung (2s Debounce)

#### Admin & Einstellungen
- ✅ Admin-Panel mit PIN-Schutz
- ✅ Kind-Verwaltung
- ✅ Aufgaben-Verwaltung
- ✅ Regeln-Verwaltung
- ✅ Belohnungen-Verwaltung
- ✅ Statistiken-Panel
- ✅ Theme-System (8 Themes)
- ✅ Mehrsprachigkeit (DE, EN, ES, FR, TR, AR)
- ✅ Benachrichtigungen (Eltern-Benachrichtigungen, Tages-Zusammenfassung)
- ✅ Tab-Reihenfolge Editor

#### Technische Basis
- ✅ Next.js 16.0.10
- ✅ React 19.2.0
- ✅ TypeScript
- ✅ Tailwind CSS 4.1.9
- ✅ Capacitor 6.2.0 (Android APK Build)
- ✅ Supabase Integration
- ✅ PWA Support
- ✅ Error Boundary
- ✅ Defensive Programming

---

## 🐛 Bekannte Probleme & Verbesserungen

### Kritische Fixes (Erledigt in Build 285)
- ✅ Integer Overflow Fix (versionCounter statt Date.now())
- ✅ PeerJS Stabilität (keine vorzeitigen Stopps)
- ✅ Initial Cloud-Push beim Start
- ✅ Master Upload Button für fehlende Daten

### Potenzielle Verbesserungen

#### Performance
- [ ] Code-Splitting für größere Komponenten
- [ ] Lazy Loading für Bilder/Assets
- [ ] Memoization für teure Berechnungen
- [ ] Bundle-Größe optimieren (aktuell möglicherweise groß)

#### Daten-Synchronisierung
- [ ] Konflikt-Erkennung bei gleichzeitigen Änderungen
- [ ] Offline-Queue für Änderungen (wenn offline)
- [ ] Bessere Fehlerbehandlung bei Sync-Fehlern
- [ ] Retry-Mechanismus für fehlgeschlagene Syncs
- [ ] Verschlüsselung für sensible Daten (optional)

#### UX/UI
- [ ] Loading-States für alle Async-Operationen
- [ ] Bessere Fehlermeldungen für Benutzer
- [ ] Accessibility-Verbesserungen (ARIA-Labels, Keyboard-Navigation)
- [ ] Dark-Mode Optimierungen für alle Themes
- [ ] Mobile-Keyboard Handling verbessern

#### Stabilität
- [ ] Mehr Unit-Tests für kritische Funktionen
- [ ] E2E-Tests für Haupt-Workflows
- [ ] Error-Logging Service (z.B. Sentry)
- [ ] Performance-Monitoring

---

## 🚀 Geplante Features (Roadmap)

### Version 2.3.0 - Q1 2026

#### Familien-Sync System (Wiedereinführung)
- [ ] Familien-Sync aus Beta-Archiv wieder aktivieren
- [ ] Echtzeit-Sync mit Supabase Realtime
- [ ] QR-Code Scanner für einfaches Beitreten
- [ ] Master/Admin/Child Rollen-System
- [ ] Geräte-Verwaltung (Geräte anzeigen/entfernen)
- [ ] Push-Benachrichtigungen bei Remote-Änderungen
- [ ] Erweiterte Konflikt-Lösung (Merge-Strategien)
- [ ] Verschlüsselte End-to-End Kommunikation

#### Verbesserungen
- [ ] Bluetooth-Sync für unterwegs (Alternative zu WLAN)
- [ ] Auto-Sync für Cloud (aktuell nur manuell)
- [ ] Backup-Verschlüsselung (optional)
- [ ] Mehrere Backup-Profile

### Version 2.4.0 - Q2 2026

#### Erweiterte Features
- [ ] Kalender-Integration (Google Calendar, iCal)
- [ ] Aufgaben-Vorlagen (Templates)
- [ ] Wiederkehrende Aufgaben mit komplexen Regeln
- [ ] Aufgaben-Gruppen/Kategorien
- [ ] Erweiterte Statistiken (Charts, Trends)
- [ ] Export-Funktionen (PDF-Reports, CSV)

#### Social Features
- [ ] Familien-Chat (optional)
- [ ] Erfolgs-Sharing (Screenshots)
- [ ] Familien-Rangliste (optional)

### Version 3.0.0 - Q3 2026

#### Native App Features
- [ ] Google Play Store Veröffentlichung
- [ ] Apple App Store Veröffentlichung
- [ ] Push-Notifications (native)
- [ ] Biometric Login (Fingerprint/Face ID)
- [ ] Camera Integration für QR-Scan (native)
- [ ] Offline-Modus mit lokaler DB (SQLite)
- [ ] Background-Sync

#### Enterprise Features
- [ ] Multi-Familien-Support (für Schulen/Kitas)
- [ ] Admin-Dashboard (Web-Interface)
- [ ] API für Drittanbieter-Integration
- [ ] White-Label Optionen

---

## 🔧 Technische Verbesserungen

### Code-Qualität
- [ ] ESLint-Regeln verschärfen
- [ ] Prettier für konsistente Formatierung
- [ ] TypeScript strict mode aktivieren
- [ ] Code-Review Checkliste erstellen
- [ ] Dokumentation für Entwickler (JSDoc)

### Architektur
- [ ] State-Management optimieren (Context vs. Zustand)
- [ ] API-Layer abstrahieren
- [ ] Service-Worker für Offline-Support
- [ ] Caching-Strategie definieren
- [ ] Datenbank-Migration-System

### Testing
- [ ] Jest Setup für Unit-Tests
- [ ] React Testing Library für Komponenten-Tests
- [ ] Playwright für E2E-Tests
- [ ] Test-Coverage Ziel: 70%+
- [ ] CI/CD Pipeline (GitHub Actions)

### Performance
- [ ] Lighthouse Score: 90+ (Performance)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Bundle-Analyzer Integration
- [ ] Image-Optimization (WebP, Lazy Loading)

### Sicherheit
- [ ] Content Security Policy (CSP)
- [ ] XSS-Schutz
- [ ] CSRF-Schutz
- [ ] Daten-Verschlüsselung (at rest)
- [ ] Secure Storage für sensible Daten

---

## 📱 Mobile Optimierungen

### Android
- [ ] APK-Signierung für Release-Builds
- [ ] App-Bundle für Play Store
- [ ] ProGuard/R8 Optimierung
- [ ] Native Permissions Handling
- [ ] Deep-Linking Support

### iOS
- [ ] Capacitor iOS Platform hinzufügen
- [ ] App Store Connect Setup
- [ ] iOS-spezifische Optimierungen
- [ ] Push-Notifications (APNs)
- [ ] Face ID / Touch ID Integration

### PWA
- [ ] Service Worker Update-Strategie
- [ ] Offline-Fallback-Seite
- [ ] Install-Prompt optimieren
- [ ] App-Icon für alle Plattformen
- [ ] Splash-Screen für alle Geräte

---

## 📚 Dokumentation

### Benutzer-Dokumentation
- [ ] Getting Started Guide
- [ ] Feature-Übersicht
- [ ] FAQ
- [ ] Video-Tutorials (optional)
- [ ] Screenshots für App Stores

### Entwickler-Dokumentation
- [ ] Setup-Anleitung (SETUP_LOCAL.md erweitern)
- [ ] Architektur-Dokumentation
- [ ] API-Dokumentation
- [ ] Contributing Guidelines
- [ ] Code-Style Guide

### Deployment-Dokumentation
- [ ] Vercel Deployment Guide
- [ ] Android Build Guide (BUILD_INSTRUCTIONS.md erweitern)
- [ ] iOS Build Guide
- [ ] Environment Variables Dokumentation
- [ ] Supabase Setup Guide

---

## 🎯 Prioritäten (Sprint-Planung)

### Sprint 1 (Sofort)
1. ✅ Integer Overflow Fix (erledigt)
2. ✅ PeerJS Stabilität (erledigt)
3. [ ] Performance-Optimierungen (Code-Splitting)
4. [ ] Error-Logging Service einrichten

### Sprint 2 (Nächste 2 Wochen)
1. [ ] Familien-Sync System reaktivieren
2. [ ] Echtzeit-Sync implementieren
3. [ ] QR-Code Scanner verbessern
4. [ ] Konflikt-Erkennung

### Sprint 3 (Nächster Monat)
1. [ ] Unit-Tests für kritische Funktionen
2. [ ] E2E-Tests für Haupt-Workflows
3. [ ] Dokumentation erweitern
4. [ ] Bundle-Größe optimieren

### Sprint 4 (Q1 2026)
1. [ ] Google Play Store Vorbereitung
2. [ ] Push-Notifications
3. [ ] Native Camera Integration
4. [ ] Offline-Modus mit lokaler DB

---

## 📊 Metriken & Ziele

### Performance-Ziele
- Lighthouse Performance Score: **90+**
- First Contentful Paint: **< 1.5s**
- Time to Interactive: **< 3s**
- Bundle Size: **< 500KB** (initial)

### Qualitäts-Ziele
- Test Coverage: **70%+**
- TypeScript Coverage: **100%**
- ESLint Errors: **0**
- Critical Bugs: **0**

### Feature-Ziele
- Familien-Sync: **Q1 2026**
- Play Store Release: **Q2 2026**
- App Store Release: **Q3 2026**

---

## 🔄 Wartung & Updates

### Regelmäßige Aufgaben
- [ ] Dependencies aktualisieren (monatlich)
- [ ] Security-Audits (vierteljährlich)
- [ ] Performance-Reviews (vierteljährlich)
- [ ] User-Feedback sammeln und analysieren
- [ ] Bug-Reports priorisieren

### Versionierung
- **Major** (3.0.0): Breaking Changes, große Features
- **Minor** (2.3.0): Neue Features, rückwärtskompatibel
- **Patch** (2.2.1): Bugfixes, kleine Verbesserungen

---

## 📝 Notizen

### Geräte-Synchronisation: ganze Sektion ausgeblendet (Feature-Flag) – **aktuell so eingestellt**
- **Sektion „Geräte verbinden / Synchronisation“** ist komplett ausgeblendet und deaktiviert. Beim App-Start wird der zugehörige Code (DeviceSyncPanel, WlanSyncProvider, PeerJS) nicht geladen.
- **Steuerung:** `lib/device-sync-feature.ts` → Konstante **`DEVICE_SYNC_SECTION_ENABLED`**.
  - **`false`** (aktuell): Sektion wird nicht angezeigt, WlanSyncProvider läuft nicht.
  - **`true`**: Sektion und Sync wie früher – wieder aktivieren, indem du in `lib/device-sync-feature.ts` **`DEVICE_SYNC_SECTION_ENABLED = true`** setzt. Keine weiteren Änderungen nötig.

### Geräte-Synchronisation: WLAN v2 und Cloud (nur diese Optionen deaktivieren)
- **Aktuell:** WLAN, WLAN v2 und Cloud sind alle aktiv und im Admin unter „Geräte verbinden / Synchronisation“ wählbar.
- **Falls du WLAN v2 und Cloud ausblenden willst** (nur WLAN 1 anzeigen):
  1. **`components/admin/device-sync-panel.tsx`:** Buttons „Cloud“ und „WLAN v2“ entfernen oder auskommentieren; nur den WLAN-Button anzeigen. Wenn `syncMethod` in den Einstellungen `cloud` oder `wlan_v2` ist, für die Anzeige auf `wlan` mappen (z. B. `syncMethod = rawSyncMethod === "cloud" || rawSyncMethod === "wlan_v2" ? "wlan" : rawSyncMethod`). Den Block `{syncMethod === "wlan_v2" && <WlanV2SyncSection />}` und den Cloud-Hinweis-Card entfernen.
  2. **`hooks/use-wlan-sync.ts`:** `isWlan` nur noch für `method === "wlan"` auf `true` setzen (also `const isWlan = method === "wlan"`), damit die Engines für WLAN v2 und Cloud nicht starten.
- **Wieder aktivieren:** Die obigen Änderungen rückgängig machen: alle drei Buttons (Cloud, WLAN, WLAN v2) anzeigen, `syncMethod` nicht mehr auf `wlan` mappen, `WlanV2SyncSection` und Cloud-Card wieder einbinden, und in `use-wlan-sync.ts` wieder `const isWlan = method === "wlan" || method === "wlan_v2"` verwenden.

### Bekannte Einschränkungen
- iOS Cache-Limit: 7 Tage Offline-Nutzung
- Keine Push-Notifications auf iOS (PWA)
- Installation nur über Safari möglich (iOS PWA)

### Technische Schulden
- Beta-Archive Features müssen reaktiviert werden
- Einige Komponenten benötigen Refactoring
- State-Management könnte optimiert werden
- Test-Coverage ist aktuell niedrig

---

**Letzte Aktualisierung:** 2025-12-30
**Version:** 2.2.0.285
**Status:** ✅ Stabil
