import { NextResponse } from "next/server"

export const dynamic = "force-static"

/**
 * Serverseitige Prüfung, ob Supabase konfiguriert ist (RLS/Client nutzen diese Werte nicht).
 * Gibt nur { configured: boolean } zurück.
 */
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    ""
  ).trim()
  const configured = url.length > 0 && key.length > 0 && (url.startsWith("http://") || url.startsWith("https://"))
  return NextResponse.json({ configured })
}
