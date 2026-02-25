# FamiApp - Installationsanleitung

## 🚀 Schnellstart (PWA Installation)

Die einfachste Methode - funktioniert sofort:

### 1. Development-Server starten
```bash
npm run dev
```

### 2. App im Browser öffnen
Öffne http://localhost:3000 in deinem Browser

### 3. Als PWA installieren

**Chrome/Edge (Desktop & Android):**
- Klicke auf das Install-Symbol (➕) in der Adressleiste
- Oder: Menü (⋮) → "App installieren" / "Zum Startbildschirm hinzufügen"

**Firefox:**
- Menü → "Zum Startbildschirm hinzufügen"

**Safari (iOS):**
- Teilen-Button (□↑) → "Zum Home-Bildschirm"

**Android Chrome:**
- Menü (⋮) → "Zum Startbildschirm hinzufügen"

## 📦 Production Build

### Statischer Export (für Deployment)
```bash
npm run export
```
Erstellt einen statischen Export im `out/` Ordner.

### Android APK Build
```bash
npm run mobile:build
```
Dies erstellt den Export und öffnet Android Studio.

**Voraussetzungen:**
- Android Studio installiert
- Java JDK 11+ installiert
- Android SDK (mindestens API 33)

Siehe `BUILD_INSTRUCTIONS.md` für Details.

## ✅ Voraussetzungen

### Minimal (für PWA)
- ✅ Node.js 18+ (bereits installiert)
- ✅ npm (bereits installiert)
- ✅ Browser mit PWA-Support

### Für Android APK
- ✅ Android Studio
- ✅ Java JDK 11+
- ✅ Android SDK

## 🔧 Konfiguration

### Environment Variables (OPTIONAL)

Die App funktioniert **vollständig ohne Supabase**!

Falls du Cloud-Sync möchtest, erstelle `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=deine_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_supabase_key
```

**Ohne Supabase:**
- ✅ QR-Code Sync funktioniert lokal
- ✅ Alle Kernfunktionen verfügbar
- ✅ Vollständig offline-fähig

## 📱 Verfügbare Scripts

```bash
npm run dev          # Development-Server (http://localhost:3000)
npm run build        # Production Build
npm run export       # Statischer Export (für PWA)
npm run start        # Production Server
npm run lint         # Code Linting
npm run mobile:build # Android APK Build
```

## 🎯 Installations-Optionen

### Option 1: PWA (Empfohlen - Einfachste Methode)
- ✅ Kein Build nötig
- ✅ Funktioniert sofort
- ✅ Automatische Updates
- ✅ Funktioniert auf allen Plattformen

### Option 2: Android APK
- ✅ Native App-Erfahrung
- ✅ Play Store veröffentlichbar
- ⚠️ Benötigt Android Studio
- ⚠️ Komplexerer Build-Prozess

### Option 3: Vercel Deployment
- ✅ Automatisches Deployment
- ✅ HTTPS inklusive
- ✅ CDN-Optimierung
- ✅ Einfaches Teilen per Link

## 🐛 Troubleshooting

### App startet nicht
```bash
# Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Build-Fehler
```bash
# Cache löschen
rm -rf .next
npm run build
```

### TypeScript-Fehler
Die App ignoriert TypeScript-Fehler im Build (`ignoreBuildErrors: true`).
Für Entwicklung: Prüfe die Fehler in der IDE.

## 📚 Weitere Informationen

- **BUILD_INSTRUCTIONS.md** - Detaillierte Android APK Anleitung
- **LOCAL_STORAGE_MIGRATION.md** - Informationen zur lokalen Storage-Migration
- **PROJECT_PLAN.md** - Projekt-Roadmap und Features

## ✨ Nächste Schritte

1. **App starten**: `npm run dev`
2. **Im Browser öffnen**: http://localhost:3000
3. **Als PWA installieren**: Siehe oben
4. **Kind-Profil erstellen**: Admin-Panel → Kind hinzufügen
5. **Loslegen**: Aufgaben erstellen, Belohnungen einrichten

Viel Erfolg! 🎉
