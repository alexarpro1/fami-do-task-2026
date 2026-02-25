/**
 * sync-v2 – Typen für Synchronisierung und Backup.
 * Keine Abhängigkeit von family-sync.ts oder Supabase/Firebase-SDK.
 */

import type { FamilyState } from "@/types"

export interface SyncPayloadMeta {
  deviceId: string
  deviceName: string
  familyCode?: string
  updatedAt: string
}

/** Ein einheitliches Payload für Familie + Spiele-Fortschritt. */
export interface SyncPayload {
  family: FamilyState
  gameProgress: Record<string, string>
  meta: SyncPayloadMeta
}

export interface RemoteVersion {
  major: number
  minor: number
  patch: number
  build: number
}
