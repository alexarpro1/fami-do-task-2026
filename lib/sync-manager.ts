import { Preferences } from "@capacitor/preferences"
import type { FamilyState } from "@/types"

export interface SyncToken {
  state: FamilyState
  deviceId: string
  deviceName: string
  createdAt: string
}

/**
 * Save sync data with a token
 */
export async function saveSyncToken(token: string, data: SyncToken): Promise<void> {
  await Preferences.set({
    key: `sync_token_${token}`,
    value: JSON.stringify(data),
  })
}

/**
 * Load sync data from a token
 */
export async function loadSyncToken(token: string): Promise<SyncToken | null> {
  const result = await Preferences.get({ key: `sync_token_${token}` })
  if (!result.value) {
    return null
  }
  return JSON.parse(result.value) as SyncToken
}

/**
 * Clean up old sync tokens (older than 24 hours)
 */
export async function cleanupOldSyncTokens(): Promise<void> {
  const { keys } = await Preferences.keys()
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  for (const key of keys) {
    if (key.startsWith("sync_token_")) {
      const result = await Preferences.get({ key })
      if (result.value) {
        try {
          const data = JSON.parse(result.value) as SyncToken
          const createdAt = new Date(data.createdAt).getTime()
          if (createdAt < oneDayAgo) {
            await Preferences.remove({ key })
          }
        } catch (error) {
          // Invalid token, remove it
          await Preferences.remove({ key })
        }
      }
    }
  }
}

/**
 * Compress state data for QR code (if needed)
 */
export function compressStateForQR(state: FamilyState): string {
  // Remove unnecessary data for sync
  const compactState = {
    children: state.children.map((child) => ({
      id: child.id,
      name: child.name,
      points: child.points,
      avatar: child.avatar,
    })),
    tasks: state.tasks.slice(0, 20), // Limit to recent tasks
    settings: state.settings,
  }
  return JSON.stringify(compactState)
}
