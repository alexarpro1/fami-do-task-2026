import type { Child } from "@/types"

export type ChildLocationHistoryEntry = NonNullable<Child["locationHistory"]>[number]

const DAY_MS = 24 * 60 * 60 * 1000
export const LOCATION_HISTORY_RETENTION_DAYS = 30
const LOCATION_HISTORY_RETENTION_MS = LOCATION_HISTORY_RETENTION_DAYS * DAY_MS
const LOCATION_HISTORY_MAX_ENTRIES = 3000

export function pruneLocationHistory(
  history: Child["locationHistory"] | undefined,
  nowMs = Date.now(),
): ChildLocationHistoryEntry[] {
  const minTs = nowMs - LOCATION_HISTORY_RETENTION_MS
  const list = (history ?? []).filter((entry) => {
    const ts = new Date(entry.recordedAt).getTime()
    return Number.isFinite(ts) && ts >= minTs
  })
  return list.slice(0, LOCATION_HISTORY_MAX_ENTRIES)
}

export function appendLocationHistoryEntry(
  history: Child["locationHistory"] | undefined,
  entry: ChildLocationHistoryEntry,
): ChildLocationHistoryEntry[] {
  const cleaned = pruneLocationHistory(history)
  const withoutSameSendId =
    entry.sendId != null ? cleaned.filter((h) => h.sendId !== entry.sendId) : cleaned
  return [entry, ...withoutSameSendId].slice(0, LOCATION_HISTORY_MAX_ENTRIES)
}

export function applyAckToLocationHistory(
  history: Child["locationHistory"] | undefined,
  ack: {
    sendId: string
    ackedAt: string
    ackedByRole: "parent" | "master"
    ackedByDeviceId?: string
  },
): ChildLocationHistoryEntry[] {
  const cleaned = pruneLocationHistory(history)
  return cleaned.map((entry) =>
    entry.sendId === ack.sendId
      ? {
          ...entry,
          ackedAt: ack.ackedAt,
          ackedByRole: ack.ackedByRole,
          ackedByDeviceId: ack.ackedByDeviceId,
        }
      : entry,
  )
}

