import type { TaskRecord } from "@/lib/db/schema"
import type { Task, TaskCategory } from "@/types"

const CATEGORIES: TaskCategory[] = ["morning", "evening", "weekend", "custom"]

function parseDays(days: string | null | undefined): string[] {
  if (days == null || days === "") return []
  try {
    const arr = JSON.parse(days) as unknown
    return Array.isArray(arr) ? arr.filter((d): d is string => typeof d === "string") : []
  } catch {
    return []
  }
}

function toCategory(value: string | null | undefined): TaskCategory {
  if (value && CATEGORIES.includes(value as TaskCategory)) return value as TaskCategory
  return "custom"
}

/**
 * Mappt einen PowerSync-TaskRecord (snake_case, SQLite) auf das UI-Task-Format (camelCase).
 * Fehlende Felder (startTime, endTime, dailyLimit, etc.) werden mit Defaults gefüllt.
 */
export function mapTaskRecordToTask(record: TaskRecord): Task {
  return {
    id: record.id,
    title: record.title ?? "",
    description: record.description ?? undefined,
    note: undefined,
    points: record.points ?? 0,
    category: toCategory(record.category),
    difficulty: "medium",
    emoji: record.emoji ?? "✅",
    duration: undefined,
    days: parseDays(record.days),
    isActive: (record.is_active ?? 1) === 1,
    order: record.order ?? 0,
    dailyLimit: undefined,
    usageCount: undefined,
    startTime: undefined,
    endTime: undefined,
    repeatInterval: undefined,
    timerOptions: undefined,
  }
}
