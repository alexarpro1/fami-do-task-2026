import type { Child } from "@/types"

export type ParentLocationOverviewStats = {
  totalChildren: number
  childrenWithAnyLocation: number
  ackToday: number
  pendingAckNow: number
  lastAckAt: string | null
  totalAckEntries: number
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function computeParentLocationOverviewStats(
  children: Child[] | undefined,
): ParentLocationOverviewStats {
  const list = children ?? []
  let childrenWithAnyLocation = 0
  let ackToday = 0
  let pendingAckNow = 0
  let totalAckEntries = 0
  let lastAckAt: string | null = null

  for (const child of list) {
    if (child.lastSharedLocation?.lat != null) childrenWithAnyLocation += 1
    const loc = child.lastSharedLocation
    if (loc?.sendId && !loc.ackedAt) pendingAckNow += 1
    const history = child.locationAckHistory ?? []
    totalAckEntries += history.length
    for (const entry of history) {
      if (isToday(entry.ackedAt)) ackToday += 1
      if (!lastAckAt || entry.ackedAt > lastAckAt) lastAckAt = entry.ackedAt
    }
    if (loc?.ackedAt && (!lastAckAt || loc.ackedAt > lastAckAt)) {
      lastAckAt = loc.ackedAt
      if (isToday(loc.ackedAt)) ackToday += 1
    }
  }

  return {
    totalChildren: list.length,
    childrenWithAnyLocation,
    ackToday,
    pendingAckNow,
    lastAckAt,
    totalAckEntries,
  }
}
