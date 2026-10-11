import type { Child } from "@/types"

const LAT_MIN = -90
const LAT_MAX = 90
const LON_MIN = -180
const LON_MAX = 180

export function isFiniteCoord(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n)
}

export function isValidLatLon(lat: unknown, lon: unknown): boolean {
  return isFiniteCoord(lat) && isFiniteCoord(lon) && lat >= LAT_MIN && lat <= LAT_MAX && lon >= LON_MIN && lon <= LON_MAX
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

export type ParsedLiveLocation = {
  syncId: string
  childId: string
  deviceId?: string
  sendId: string
  lat: number
  lon: number
  accuracyM?: number
  sentAt?: string
  source?: "interval" | "live" | "manual"
  recordedAt: string
}

export type ParsedLiveAck = {
  syncId: string
  childId: string
  sendId: string
  ackedAt: string
  ackedByRole: "parent" | "master"
  ackedByDeviceId?: string
  deviceId?: string
}

/**
 * Validiert eingehende Live-Location-Payloads (Broadcast / Events).
 * Erwartet passende syncId (Kanal) und gültige Koordinaten.
 */
export function parseLiveLocationPayload(
  raw: unknown,
  expectedSyncId: string,
): ParsedLiveLocation | null {
  if (!raw || typeof raw !== "object") return null
  const p = raw as Record<string, unknown>
  if (!isNonEmptyString(p.syncId) || p.syncId !== expectedSyncId) return null
  if (!isNonEmptyString(p.childId) || !isNonEmptyString(p.sendId)) return null
  if (!isValidLatLon(p.lat, p.lon)) return null
  if (!isNonEmptyString(p.recordedAt)) return null
  const source = p.source
  if (
    source != null &&
    source !== "interval" &&
    source !== "live" &&
    source !== "manual"
  ) {
    return null
  }
  const accuracyM =
    typeof p.accuracyM === "number" && Number.isFinite(p.accuracyM)
      ? Math.max(0, Math.round(p.accuracyM))
      : undefined
  return {
    syncId: p.syncId,
    childId: p.childId,
    deviceId: isNonEmptyString(p.deviceId) ? p.deviceId : undefined,
    sendId: p.sendId,
    lat: p.lat as number,
    lon: p.lon as number,
    accuracyM,
    sentAt: isNonEmptyString(p.sentAt) ? p.sentAt : undefined,
    source: source as ParsedLiveLocation["source"],
    recordedAt: p.recordedAt,
  }
}

export function parseLiveAckPayload(raw: unknown, expectedSyncId: string): ParsedLiveAck | null {
  if (!raw || typeof raw !== "object") return null
  const p = raw as Record<string, unknown>
  if (!isNonEmptyString(p.syncId) || p.syncId !== expectedSyncId) return null
  if (!isNonEmptyString(p.childId) || !isNonEmptyString(p.sendId)) return null
  if (!isNonEmptyString(p.ackedAt)) return null
  if (p.ackedByRole !== "parent" && p.ackedByRole !== "master") return null
  return {
    syncId: p.syncId,
    childId: p.childId,
    sendId: p.sendId,
    ackedAt: p.ackedAt,
    ackedByRole: p.ackedByRole,
    ackedByDeviceId: isNonEmptyString(p.ackedByDeviceId) ? p.ackedByDeviceId : undefined,
    deviceId: isNonEmptyString(p.deviceId) ? p.deviceId : undefined,
  }
}

/** Kind muss lokal existieren, bevor Standort aus dem Netz übernommen wird. */
export function childExistsInList(children: Child[] | undefined, childId: string): boolean {
  return (children ?? []).some((c) => c.id === childId)
}
