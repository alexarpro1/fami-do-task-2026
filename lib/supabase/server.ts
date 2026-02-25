import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Important: Don't put this client in a global variable when using Fluid compute.
 * Always create a new client within each function.
 * 
 * Supabase is now optional - returns a mock client if not configured.
 */
export async function createClient() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Supabase is optional - return mock client if not configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      from: () => ({
        insert: () => ({ select: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }) }),
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }) }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }) }),
      }),
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Component - ignore
        }
      },
    },
  })
}
