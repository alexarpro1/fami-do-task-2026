/**
 * Entity-basiertes Sync mit Last-Write-Wins und Tombstones (isDeleted).
 * Für Listen, die über WLAN zwischen Geräten synchronisiert werden.
 */

/** Standard-Format für alle Daten, die synchronisiert werden sollen */
export interface SyncEntity<T> {
  id: string
  data: T
  updatedAt: number // UNIX Timestamp (Date.now())
  isDeleted: boolean // Tombstone für gelöschte Daten
}

/** Payload, der über PeerJS gesendet wird */
export interface SyncPayload<T> {
  type: "FULL_SYNC" | "DELTA_SYNC"
  items: SyncEntity<T>[]
  timestamp: number
}

/** 30 Tage in Millisekunden – Zeitfenster, damit alle Geräte sich syncen können, bevor Tombstones endgültig entfernt werden */
export const TOMBSTONE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Garbage Collection: Entfernt Tombstones, die älter als TOMBSTONE_LIFETIME_MS sind.
 * Beim App-Start nach dem Laden aus localStorage aufrufen.
 */
export function cleanupTombstones<T>(items: SyncEntity<T>[]): SyncEntity<T>[] {
  const now = Date.now()
  return items.filter((item) => {
    if (!item.isDeleted) return true
    const isRecentTombstone = now - item.updatedAt < TOMBSTONE_LIFETIME_MS
    return isRecentTombstone
  })
}

/**
 * Vergleicht lokale und remote Daten und merged sie nach dem "Last-Write-Wins"-Prinzip.
 * Neuere Zeitstempel gewinnen; Tombstones (isDeleted: true) werden mitgeführt.
 */
export function mergeSyncData<T>(
  localItems: SyncEntity<T>[],
  remoteItems: SyncEntity<T>[]
): SyncEntity<T>[] {
  const mergedMap = new Map<string, SyncEntity<T>>()

  for (const item of localItems) {
    mergedMap.set(item.id, { ...item })
  }

  for (const remoteItem of remoteItems) {
    const localItem = mergedMap.get(remoteItem.id)

    if (!localItem) {
      mergedMap.set(remoteItem.id, { ...remoteItem })
    } else if (remoteItem.updatedAt > localItem.updatedAt) {
      mergedMap.set(remoteItem.id, { ...remoteItem })
    }
  }

  return Array.from(mergedMap.values())
}
