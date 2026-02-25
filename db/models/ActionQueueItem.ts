// ============================================
// WatermelonDB Model: ActionQueueItem
// ============================================
// Entspricht types/offline-first.ts ActionQueueItem.
// payload wird als JSON-String gespeichert.

import { Model } from "@nozbe/watermelondb"
import { table, field, date, readonly } from "@nozbe/watermelondb/decorators"
import type { ActionType, EntityType, ActionQueueStatus } from "../../types/offline-first"

@table("action_queue")
export class ActionQueueItem extends Model {
  @field("action") action!: ActionType
  @field("entity_type") entityType!: EntityType
  @field("entity_id") entityId!: string
  /** Gespeichert als JSON-Objekt-String (Record<string, unknown>). */
  @field("payload") payloadRaw!: string
  @date("created_at") @readonly createdAt!: Date
  @date("updated_at") updatedAt!: Date
  @field("retry_count") retryCount!: number
  @field("last_error") lastError!: string | null
  @field("status") status!: ActionQueueStatus
  @date("synced_at") syncedAt!: Date | null

  get payload(): Record<string, unknown> {
    try {
      const parsed = JSON.parse(this.payloadRaw || "{}")
      return typeof parsed === "object" && parsed !== null ? parsed : {}
    } catch {
      return {}
    }
  }

  set payload(value: Record<string, unknown>) {
    this.payloadRaw = JSON.stringify(value ?? {})
  }
}
