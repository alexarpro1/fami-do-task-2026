# Automatisches Versionierungs-System

## Wie es funktioniert

Die App verwendet ein automatisches Build-Nummern-System:

**Format**: `V2.2.0.216`
- `2.2.0` = Stable Release Version
- `216` = Build-Nummer (erhöht sich automatisch)

## Automatische Updates

Die Build-Nummer erhöht sich automatisch bei:
- `npm run build` (Production Build)
- `npm run export` (APK Export)
- `npm run mobile:build` (Mobile Build)

## Manuelle Build-Erhöhung

```bash
npm run version:bump
```

## Wie die Version angezeigt wird

- **Settings Footer**: `FamiApp V2.2.0.216 • 27.01.2025, 15:45`
- **Backup Files**: `famiapp-backup-v2.2.0.216.json`
- **Changelog**: Wird automatisch mit aktueller Build-Nummer versehen

## Version ändern

Manuell in `lib/version.ts`:
```typescript
export const APP_VERSION = {
  major: 2,      // Große Änderungen
  minor: 2,      // Neue Features
  patch: 0,      // Bug Fixes
  build: 216,    // Auto-inkrementiert
}
```

Das Build-Script (`scripts/increment-version.js`) erhöht automatisch nur die Build-Nummer und aktualisiert den Timestamp.
