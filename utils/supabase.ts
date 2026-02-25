/**
 * Supabase-Client für Expo / React Native.
 * Für die Next.js-Web-App wird lib/supabase/client.ts verwendet.
 *
 * Benötigt: react-native-url-polyfill, @react-native-async-storage/async-storage
 * Env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY
 */
import "react-native-url-polyfill/auto"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient, processLock } from "@supabase/supabase-js"

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  },
)
