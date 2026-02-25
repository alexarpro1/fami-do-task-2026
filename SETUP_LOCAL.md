# FamiDo - Lokale Installation & APK Build

## 📦 Installation

### Voraussetzungen
- Node.js 18+ 
- npm oder yarn
- Android Studio (für Android APK)
- Java JDK 17+

### 1. Projekt Setup
```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Die App läuft jetzt auf `http://localhost:3000`

## 📱 Android APK Build

### Capacitor Setup
```bash
# Capacitor installieren (falls noch nicht vorhanden)
npm install @capacitor/core @capacitor/cli

# Android Platform hinzufügen
npx cap add android

# Web-Assets bauen
npm run build

# Assets zu Android kopieren
npx cap sync android

# Android Studio öffnen
npx cap open android
```

### APK in Android Studio bauen
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Die APK findest du unter: `android/app/build/outputs/apk/debug/app-debug.apk`

### Signed APK (für Play Store)
1. **Build** → **Generate Signed Bundle / APK**
2. Wähle **APK**
3. Erstelle/wähle einen Keystore
4. Signiere die APK

## 🔧 In Cursor/Android Studio weiterarbeiten

### Cursor (VS Code Fork)
```bash
# Projekt öffnen
cursor .

# Extensions empfohlen:
# - ESLint
# - Prettier
# - Tailwind CSS IntelliSense
```

### Android Studio
```bash
# Android-Teil öffnen
cd android
# Öffne in Android Studio: File → Open → wähle 'android' Ordner
```

## 🌐 Environment Variables

Erstelle eine `.env.local` Datei:
```env
NEXT_PUBLIC_SUPABASE_URL=deine-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
```

## 📋 Verfügbare Scripts

```bash
npm run dev          # Entwicklungsserver
npm run build        # Production Build
npm run start        # Production Server
npm run lint         # Code Linting
npm run type-check   # TypeScript Check
```

## 🔍 Projekt-Struktur

```
famido-task/
├── app/                 # Next.js App Router Pages
│   ├── admin/          # Admin Panel
│   ├── profile/        # Profil Seite
│   ├── tasks/          # Aufgaben Seite
│   └── ...
├── components/         # React Komponenten
│   ├── admin/         # Admin Komponenten
│   ├── child/         # Kind-bezogene Komponenten
│   ├── task/          # Aufgaben Komponenten
│   └── ui/            # UI Basis-Komponenten
├── contexts/          # React Context (Family, Auth)
├── hooks/             # Custom Hooks
├── lib/               # Utilities (i18n, Supabase)
├── types/             # TypeScript Types
└── android/           # Capacitor Android Build
```

## 🐛 Troubleshooting

### Build Fehler
```bash
# Cache löschen
rm -rf .next node_modules
npm install
npm run build
```

### Android Build Fehler
```bash
# Gradle Cache löschen
cd android
./gradlew clean
cd ..
npx cap sync android
```

### Port bereits belegt
```bash
# Anderen Port verwenden
PORT=3001 npm run dev
```

## 📦 Wichtige Dependencies

- **Next.js 15** - React Framework
- **Tailwind CSS v4** - Styling
- **Framer Motion** - Animationen
- **Supabase** - Backend/Database
- **Capacitor** - Native Mobile
- **React Hook Form** - Formulare
- **Recharts** - Charts/Statistiken

## 🚀 Production Deployment

### Vercel (empfohlen für Web)
```bash
# Vercel CLI installieren
npm i -g vercel

# Deployen
vercel
```

### Android Play Store
1. Signed APK/Bundle erstellen
2. Play Console → Neue App erstellen
3. APK/Bundle hochladen
4. Store Listing ausfüllen
5. Review einreichen

## 💡 Tipps

- **Hot Reload**: Änderungen werden automatisch übernommen
- **TypeScript**: Nutze `npm run type-check` vor Commits
- **Linting**: `npm run lint` vor Production Builds
- **Mobile Testing**: Nutze `npx cap run android` für Live Reload auf Gerät

Viel Erfolg! 🎉
