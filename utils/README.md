# utils

- **device.ts** – Re-Export der Geräte-Utilities aus `lib/device.ts`: `getDeviceId`, `getDeviceName`, `setDeviceName`, `isNativeApp`, `openQRScanner`, `getPlatform`, `getHardwareDeviceId`. Für Multi-Device-Sync und native App-Erkennung.
- **supabase.ts** – Supabase-Client für **Expo / React Native** (Auth mit AsyncStorage, `processLock`).
  - Wird von der **Next.js-Web-App nicht verwendet** (dort: `lib/supabase/client.ts`).
  - Wenn du ein **Expo-Projekt** nutzt (z. B. separates Mobile-App-Repo), dort folgende Pakete installieren:
    - `react-native-url-polyfill`
    - `@react-native-async-storage/async-storage`
    - `@supabase/supabase-js`
  - Umgebungsvariablen: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (Anon Key).
