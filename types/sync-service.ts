// ============================================
// SyncService – Adapter-Interfaces
// Für: Delta-Sync + Action-Queue nach Reconnect
// ============================================
// Die App bringt die konkrete Implementierung mit (z. B. WatermelonDB + Hub/Cloud-API).

import type { Task, ActionQueueItem, UnixTimestamp } from "./sync"

/**
 * Lokales Lager: lastSyncTimestamp, Pending-Queue, Anwenden von Delta-Updates.
 */
export interface SyncStorageAdapter {
  getLastSyncTimestamp(): Promise<UnixTimestamp>
  setLastSyncTimestamp(ts: UnixTimestamp): Promise<void>
  /** Einträge mit status === 'pending' (ggf. auch 'failed' mit Retry), sortiert nach createdAt (FIFO). */
  getPendingQueueItems(): Promise<ActionQueueItem[]>
  markItemSynced(id: string): Promise<void>
  markItemFailed(id: string, error: string): Promise<void>
  /** Delta vom Server anwenden (LWW: nur neuere updatedAt übernehmen). */
  applyDelta(tasks: Task[]): Promise<void>
}

/**
 * Transport zum Server (Hub oder Cloud): Delta holen, Queue-Item senden.
 */
export interface SyncTransportAdapter {
  /** Alle Tasks mit updatedAt > sinceTimestamp (Unix Sekunden). */
  fetchDelta(sinceTimestamp: UnixTimestamp): Promise<Task[]>
  /** Ein Queue-Item an den aktuell verbundenen Kanal senden. Wirft bei Fehler. */
  sendQueueItem(item: ActionQueueItem): Promise<void>
}
