// ============================================
// WatermelonDB Schema – Offline-First (SyncableTask + ActionQueueItem)
// ============================================
// Entspricht types/offline-first.ts: SyncableTask und ActionQueueItem.
// Komplexe Felder (days[], timerOptions, payload) werden als JSON-String gespeichert.

import { appSchema, tableSchema } from "@nozbe/watermelondb"

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "tasks",
      columns: [
        { name: "title", type: "string" },
        { name: "description", type: "string", isOptional: true },
        { name: "note", type: "string", isOptional: true },
        { name: "points", type: "number" },
        { name: "category", type: "string" },
        { name: "difficulty", type: "string" },
        { name: "emoji", type: "string" },
        { name: "duration", type: "number", isOptional: true },
        { name: "days", type: "string" },
        { name: "is_active", type: "boolean" },
        { name: "order", type: "number" },
        { name: "daily_limit", type: "number", isOptional: true },
        { name: "usage_count", type: "number", isOptional: true },
        { name: "start_time", type: "string", isOptional: true },
        { name: "end_time", type: "string", isOptional: true },
        { name: "repeat_interval", type: "number", isOptional: true },
        { name: "timer_options", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
        { name: "is_deleted", type: "boolean" },
      ],
    }),
    tableSchema({
      name: "action_queue",
      columns: [
        { name: "action", type: "string" },
        { name: "entity_type", type: "string" },
        { name: "entity_id", type: "string" },
        { name: "payload", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
        { name: "retry_count", type: "number" },
        { name: "last_error", type: "string", isOptional: true },
        { name: "status", type: "string" },
        { name: "synced_at", type: "number", isOptional: true },
      ],
    }),
  ],
})
