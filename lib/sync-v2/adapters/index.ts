/**
 * sync-v2 – Adapter-Factory: Erzeugt Sync- und UpdateCheck-Adapter anhand der Konfiguration.
 */

import type { SyncAdapter } from "./types"
import type { UpdateCheckAdapter } from "./types"
import { createSupabaseSyncAdapter } from "./supabase"
import { createGoogleDriveSyncAdapter } from "./google-drive"
import { createStaticVersionAdapter } from "./static-version"

export type SyncBackendId = "supabase" | "google-drive" | "none"

function getSyncBackend(): SyncBackendId {
  if (typeof process === "undefined") return "none"
  const v = process.env.NEXT_PUBLIC_SYNC_BACKEND
  if (v === "supabase" || v === "google-drive") return v
  return "none"
}

function getGoogleDriveToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem("gdrive_account")
    if (!raw) return null
    const acc = JSON.parse(raw) as { id?: string }
    return acc?.id ? sessionStorage.getItem(`gdrive_token_${acc.id}`) : null
  } catch {
    return null
  }
}

/**
 * Liefert den Sync-Adapter für das angegebene Backend (oder aus NEXT_PUBLIC_SYNC_BACKEND).
 */
export function getSyncAdapter(backend?: SyncBackendId): SyncAdapter | null {
  const b = backend ?? getSyncBackend()
  if (b === "supabase") return createSupabaseSyncAdapter()
  if (b === "google-drive") return createGoogleDriveSyncAdapter(getGoogleDriveToken)
  return null
}

/**
 * Liefert den Standard-UpdateCheck-Adapter (statische version.json).
 */
export function getUpdateCheckAdapter(): UpdateCheckAdapter {
  return createStaticVersionAdapter()
}

export { createSupabaseSyncAdapter, setStoredFamilyCode } from "./supabase"
export { createGoogleDriveSyncAdapter } from "./google-drive"
export { createStaticVersionAdapter } from "./static-version"
export type { SyncAdapter, UpdateCheckAdapter } from "./types"
