import { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
// Unterstützt auch den alternativen Variablennamen aus dem Supabase-Dashboard
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const notConfigured = { data: null, error: { message: "Supabase not configured" } }

export function createClient() {
  // Supabase is now optional - app can work without it using local storage
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "[SUPABASE] Missing environment variables. App will use local storage instead. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) to enable cloud sync.",
    )
    // Mock-Client mit vollständiger Kette für sync_v2 (upsert + select/eq/order/limit/maybeSingle)
    return {
      from: () => ({
        insert: () => ({ select: () => Promise.resolve(notConfigured) }),
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve(notConfigured),
              }),
            }),
          }),
        }),
        upsert: () => Promise.resolve(notConfigured),
        delete: () => ({ eq: () => Promise.resolve(notConfigured) }),
      }),
    } as any
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
  )
}
