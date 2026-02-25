// ============================================
// Offline-First / Sync – Datenmodelle
// Für: React Native (Expo) + WatermelonDB, Hub + Cloud Fallback
// ============================================
// Diese Typen ergänzen die bestehenden Domain-Typen (types/index.ts)
// um Sync-Metadaten und die Action Queue für Optimistic UI.

// ---------- Task (Sync-fähig) ----------
// Erweiterung des bestehenden Task um Pflichtfelder für Last-Write-Wins und Soft-Delete.
// Alle Zeiten in Unix-Millisekunden (number) für einfachen Vergleich und Delta-Sync.

import type { Task as DomainTask } from "./index"

/**
 * Sync-Metadaten, die jede synchronisierbare Entität braucht.
 * Kann später auch für Reward, Rule, Child etc. wiederverwendet werden.
 */
export interface SyncMetadata {
  /** Erstellungszeit (Unix ms). Für Sortierung und Delta-Sync. */
  createdAt: number
  /** Letzte Änderung (Unix ms). Grundlage für Last-Write-Wins. */
  updatedAt: number
  /** Strikte Soft-Delete: true = logisch gelöscht, wird nie physisch entfernt. */
  isDeleted: boolean
}

/**
 * Task für die Offline-First-Architektur.
 * Kombiniert die bestehende Task-Domain mit Sync-Metadaten.
 *
 * Feldwahl:
 * - id: Eindeutige ID (UUID/CUID), client- oder servergeneriert; Korrelation über Geräte hinweg.
 * - Domain-Felder: Wie im bestehenden Task (title, points, category, …) für Anzeige und Logik.
 * - createdAt: Wann der Task angelegt wurde; für Reihenfolge und Delta-Sync („alles nach T“).
 * - updatedAt: Wann er zuletzt geändert wurde; entscheidet bei Konflikten (LWW).
 * - isDeleted: Soft-Delete; Server und andere Clients behalten den Datensatz, filtern nur nach isDeleted.
 */
export type SyncableTask = DomainTask & SyncMetadata

/** Alternativ: eigenständiger Task-Typ, falls ihr die Sync-Entität von der Domain trennen wollt. */
export interface TaskSyncModel extends SyncMetadata {
  id: string
  title: string
  description?: string
  note?: string
  points: number
  category: DomainTask["category"]
  difficulty: DomainTask["difficulty"]
  emoji: string
  duration?: number
  days: string[]
  isActive: boolean
  order: number
  dailyLimit?: number
  usageCount?: number
  startTime?: string
  endTime?: string
  repeatInterval?: number
  timerOptions?: DomainTask["timerOptions"]
}

// ---------- Action Queue Item ----------

export type ActionType = "CREATE" | "UPDATE" | "DELETE"
export type EntityType = "TASK" | "TASK_COMPLETION" | "REWARD" | "RULE" | "CHILD"
export type ActionQueueStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED"

/**
 * Ein Eintrag in der lokalen Offline-Warteschlange.
 * Jede Benutzeraktion (Anlegen, Ändern, Abhaken, Löschen) erzeugt zuerst einen solchen Eintrag;
 * die UI wird sofort aktualisiert (Optimistic UI), das Senden passiert asynchron.
 *
 * Feldwahl:
 * - id: Lokale UUID des Queue-Eintrags; keine Abhängigkeit vom Server.
 * - action: CREATE | UPDATE | DELETE (DELETE = Soft-Delete setzen, kein physisches Löschen).
 * - entityType: Welche Entität betroffen ist (TASK, TASK_COMPLETION, …); erweiterbar.
 * - entityId: ID der betroffenen Entität (bei CREATE die clientseitig vergebene ID).
 * - payload: Bei CREATE/UPDATE die (Teil-)Entität mit updatedAt; bei DELETE z.B. { id, updatedAt, isDeleted: true }.
 * - createdAt: Lokale Zeit der Aktion; definiert die Reihenfolge der Abarbeitung (FIFO).
 * - updatedAt: Wann der Eintrag zuletzt geändert wurde (z.B. bei Retry); für Debug und evtl. Deduplizierung.
 * - retryCount: Anzahl fehlgeschlagener Sync-Versuche; für Backoff und ggf. Abbruch nach N Fehlern.
 * - lastError: Letzte Fehlermeldung vom Hub/Cloud; für Anzeige und Logs.
 * - status: PENDING (noch nicht gesendet), SYNCING (Request läuft), SYNCED (erfolgreich), FAILED (nach Retries).
 * - syncedAt: Zeitpunkt des erfolgreichen Syncs; optional für Bereinigung alter SYNCED-Einträge.
 */
export interface ActionQueueItem {
  id: string
  action: ActionType
  entityType: EntityType
  entityId: string
  /** Bei CREATE/UPDATE: volle oder partielle Entität inkl. updatedAt; bei DELETE: mind. id, updatedAt, isDeleted. */
  payload: Record<string, unknown>
  createdAt: number
  updatedAt: number
  retryCount: number
  lastError?: string
  status: ActionQueueStatus
  syncedAt?: number
}
