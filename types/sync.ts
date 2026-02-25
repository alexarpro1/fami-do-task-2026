// ============================================
// Sync-Datenmodelle – fachliche & sync-taugliche Basis
// Für: React Native (Expo) + WatermelonDB, Hub + Cloud Fallback
// ============================================
// Diese Typen sind die einzige Quelle der Wahrheit für Task und Action Queue.
// WatermelonDB-Schema und -Models leiten sich daraus ab (LWW, Delta-Sync, Soft-Delete).

/** Unix-Zeitstempel in Sekunden (für Sync und LWW einheitlich). */
export type UnixTimestamp = number

// ---------- Task ----------

export interface Task {
  /** UUID/CUID, global eindeutig (Client + Hub + Cloud). */
  id: string
  title: string
  /** Optional, lange Beschreibung. */
  description?: string
  /** "Abgehakt". */
  completed: boolean
  /** Kind/User-ID, dem die Aufgabe zugewiesen ist. */
  assignedToUserId?: string
  createdAt: UnixTimestamp
  /** LWW + Delta-Sync (lastSyncTimestamp < updatedAt). */
  updatedAt: UnixTimestamp
  /** Strict Soft-Delete, keine physische Löschung. */
  isDeleted: boolean
  /** Optional, Audit. */
  createdByUserId?: string
  /** Optional, Mehrfamilien-Support. */
  familyId?: string
  /** Manuelle Reihenfolge in der UI. */
  sortOrder?: number
}

// ---------- Action Queue Item ----------

export type ActionType = "create" | "update" | "delete"

export type QueueItemStatus = "pending" | "syncing" | "synced" | "failed"

export interface ActionQueueItem {
  /** Eindeutige Queue-Eintrags-ID (UUID/CUID). */
  id: string
  /** create | update | delete (delete = Soft-Delete setzen). */
  action: ActionType
  /** Erweiterbar: später z. B. 'reward', 'family'. */
  entityType: "task"
  /** ID des Tasks (oder anderen Entities). */
  entityId: string
  /** Snapshot für Server (LWW); bei delete z. B. { id, updatedAt, isDeleted: true }. */
  payload: Partial<Task> & { updatedAt: UnixTimestamp }
  /** Reihenfolge der Abarbeitung (FIFO). */
  createdAt: UnixTimestamp
  /** Wann zuletzt Sync-Versuch (für Backoff/Diagnose). */
  updatedAt?: UnixTimestamp
  /** Anzahl fehlgeschlagener Versuche (Backoff / Skip). */
  retryCount: number
  status: QueueItemStatus
  /** Bei status === 'failed' für Debug/UI. */
  lastError?: string
  /** Optional: Idempotenz auf dem Server. */
  deviceId?: string
}
