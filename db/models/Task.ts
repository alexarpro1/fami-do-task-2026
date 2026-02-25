// ============================================
// WatermelonDB Model: Task (SyncableTask)
// ============================================
// Entspricht types/offline-first.ts SyncableTask (DomainTask + SyncMetadata).
// Komplexe Felder days[] und timerOptions werden als JSON-String gespeichert.

import { Model } from "@nozbe/watermelondb"
import { table, field, date, readonly } from "@nozbe/watermelondb/decorators"
import type { TaskCategory, TaskDifficulty } from "../../types"

const sanitizeDays = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((d) => typeof d === "string") : []

const sanitizeTimerOptions = (raw: unknown): {
  showMiniTimer: boolean
  showVisualTimer: boolean
  showFocusTimer: boolean
} | null => {
  if (raw && typeof raw === "object" && "showMiniTimer" in raw) {
    return {
      showMiniTimer: Boolean((raw as any).showMiniTimer),
      showVisualTimer: Boolean((raw as any).showVisualTimer),
      showFocusTimer: Boolean((raw as any).showFocusTimer),
    }
  }
  return null
}

@table("tasks")
export class Task extends Model {
  @field("title") title!: string
  @field("description") description!: string | null
  @field("note") note!: string | null
  @field("points") points!: number
  @field("category") category!: TaskCategory
  @field("difficulty") difficulty!: TaskDifficulty
  @field("emoji") emoji!: string
  @field("duration") duration!: number | null
  /** Gespeichert als JSON-Array-String, z. B. ["mon","tue"]. */
  @field("days") daysRaw!: string
  @field("is_active") isActive!: boolean
  @field("order") order!: number
  @field("daily_limit") dailyLimit!: number | null
  @field("usage_count") usageCount!: number | null
  @field("start_time") startTime!: string | null
  @field("end_time") endTime!: string | null
  @field("repeat_interval") repeatInterval!: number | null
  /** Gespeichert als JSON-Objekt-String. */
  @field("timer_options") timerOptionsRaw!: string | null
  @date("created_at") @readonly createdAt!: Date
  @date("updated_at") updatedAt!: Date
  @field("is_deleted") isDeleted!: boolean

  get days(): string[] {
    try {
      return sanitizeDays(JSON.parse(this.daysRaw || "[]"))
    } catch {
      return []
    }
  }

  set days(value: string[]) {
    this.daysRaw = JSON.stringify(sanitizeDays(value))
  }

  get timerOptions(): { showMiniTimer: boolean; showVisualTimer: boolean; showFocusTimer: boolean } | null {
    if (!this.timerOptionsRaw) return null
    try {
      return sanitizeTimerOptions(JSON.parse(this.timerOptionsRaw))
    } catch {
      return null
    }
  }

  set timerOptions(value: { showMiniTimer: boolean; showVisualTimer: boolean; showFocusTimer: boolean } | null) {
    this.timerOptionsRaw = value ? JSON.stringify(value) : null
  }
}
