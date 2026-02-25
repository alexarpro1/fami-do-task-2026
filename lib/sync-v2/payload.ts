/**
 * sync-v2 – Payload aus App-State lesen und anwenden.
 * Verwendet nur übergebene Callbacks und definierte Keys; kein Import aus family-sync/supabase.
 */

import type { FamilyState } from "@/types"
import type { SyncPayload, SyncPayloadMeta } from "./types"
import { GAME_PROGRESS_KEYS } from "./constants"

const SYNC_V2_DEVICE_ID_KEY = "famiapp_sync_v2_device_id"
const SYNC_V2_DEVICE_NAME_KEY = "famiapp_sync_v2_device_name"

function getDeviceId(): string {
  if (typeof window === "undefined") return "unknown"
  let id = localStorage.getItem(SYNC_V2_DEVICE_ID_KEY)
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    localStorage.setItem(SYNC_V2_DEVICE_ID_KEY, id)
  }
  return id
}

function getDeviceName(): string {
  if (typeof window === "undefined") return "Gerät"
  return localStorage.getItem(SYNC_V2_DEVICE_NAME_KEY) || "Mein Gerät"
}

export function setDeviceName(name: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SYNC_V2_DEVICE_NAME_KEY, name)
  }
}

/**
 * Liest das komplette Sync-Payload aus dem übergebenen Familien-State und aus localStorage (Spiele-Keys).
 */
export function readPayload(
  getFamilyState: () => FamilyState,
  familyCode?: string,
): SyncPayload {
  const family = getFamilyState()
  const gameProgress: Record<string, string> = {}
  if (typeof window !== "undefined") {
    for (const key of GAME_PROGRESS_KEYS) {
      try {
        const value = localStorage.getItem(key)
        if (value != null) gameProgress[key] = value
      } catch {
        // skip
      }
    }
  }
  const meta: SyncPayloadMeta = {
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    familyCode,
    updatedAt: new Date().toISOString(),
  }
  return { family, gameProgress, meta }
}

/**
 * Wendet ein gezogenes Payload an: dispatch LOAD_STATE für Familie, schreibt gameProgress in localStorage.
 */
export function applyPayload(
  payload: SyncPayload,
  dispatch: (action: { type: "LOAD_STATE"; payload: FamilyState }) => void,
): void {
  dispatch({ type: "LOAD_STATE", payload: payload.family })
  if (typeof window !== "undefined" && payload.gameProgress) {
    for (const key of GAME_PROGRESS_KEYS) {
      const value = payload.gameProgress[key]
      if (value != null) {
        try {
          localStorage.setItem(key, value)
        } catch {
          // skip
        }
      }
    }
  }
}

export { getDeviceId, getDeviceName }
