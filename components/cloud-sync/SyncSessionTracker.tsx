"use client"

import { useSyncSession } from "@/hooks/useSyncSession"

/**
 * Registriert dieses Gerät beim App-Start in der devices-Tabelle.
 * Sendet regelmäßig Heartbeats (last_active). Rendert nichts.
 */
export function SyncSessionTracker() {
  useSyncSession()
  return null
}
