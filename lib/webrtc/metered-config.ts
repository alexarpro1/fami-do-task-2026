/**
 * Metered-Konfiguration für Audio-Raum (TURN + Realtime Signaling).
 *
 * Wichtig: Next.js inlined nur STATISCHE Zugriffe auf process.env.NEXT_PUBLIC_*.
 * Dynamisches process.env[name] ist im Client immer undefined.
 */

export function getMeteredDomain(): string | undefined {
  const v = process.env.NEXT_PUBLIC_METERED_DOMAIN
  return typeof v === "string" && v.trim() ? v.trim() : undefined
}

/** Credential-scoped API key (darf im Client liegen). */
export function getMeteredTurnApiKey(): string | undefined {
  const v = process.env.NEXT_PUBLIC_METERED_TURN_API_KEY
  return typeof v === "string" && v.trim() ? v.trim() : undefined
}

/** Publishable Realtime key `pk_live_…` (browser-safe). */
export function getMeteredRealtimeApiKey(): string | undefined {
  const v = process.env.NEXT_PUBLIC_METERED_REALTIME_API_KEY
  return typeof v === "string" && v.trim() ? v.trim() : undefined
}

export function isMeteredTurnConfigured(): boolean {
  return Boolean(getMeteredDomain() && getMeteredTurnApiKey())
}

export function isMeteredRealtimeConfigured(): boolean {
  const key = getMeteredRealtimeApiKey()
  return Boolean(key && key.startsWith("pk_"))
}

/** Kanalname ohne Doppelpunkte (Metered-Channel-freundlich). */
export function meteredAudioRoomChannel(syncId: string, roomId: string): string {
  const safe = (s: string, max: number) => s.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, max)
  return `fami-audio-${safe(syncId, 32)}-${safe(roomId, 48)}`
}
