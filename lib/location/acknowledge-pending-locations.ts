import type { Dispatch } from "react"
import type { Child, FamilyAction } from "@/types"
import { applyAckToLocationHistory } from "@/lib/location/location-history"

export type AckDeviceRole = "parent" | "master"

export type AcknowledgePendingResult = {
  acknowledgedCount: number
  events: Array<{
    childId: string
    sendId: string
    ackedAt: string
    ackedByRole: AckDeviceRole
    ackedByDeviceId?: string
  }>
}

/**
 * Bestätigt alle offenen Standort-Sendungen (ohne ACK) – nur für parent/master vorgesehen.
 * Gibt Events zurück, die der Caller optional als Live-ACK broadcasten kann.
 */
export function acknowledgeAllPendingLocations(
  children: Child[] | undefined,
  dispatch: Dispatch<FamilyAction>,
  opts: { role: AckDeviceRole; deviceId?: string },
): AcknowledgePendingResult {
  const nowIso = new Date().toISOString()
  const events: AcknowledgePendingResult["events"] = []
  let acknowledgedCount = 0

  for (const child of children ?? []) {
    const loc = child.lastSharedLocation
    if (!loc?.sendId || loc.ackedAt) continue

    const existingHistory = child.locationAckHistory ?? []
    const alreadyLogged = existingHistory.some((entry) => entry.sendId === loc.sendId)
    const nextHistory = alreadyLogged
      ? existingHistory
      : [
          {
            sendId: loc.sendId,
            ackedAt: nowIso,
            ackedByRole: opts.role,
            ackedByDeviceId: opts.deviceId,
            auto: true as const,
          },
          ...existingHistory,
        ].slice(0, 30)

    dispatch({
      type: "UPDATE_CHILD",
      payload: {
        id: child.id,
        updates: {
          lastSharedLocation: {
            ...loc,
            ackedAt: nowIso,
            ackedByRole: opts.role,
            ackedByDeviceId: opts.deviceId,
          },
          locationHistory: applyAckToLocationHistory(child.locationHistory, {
            sendId: loc.sendId,
            ackedAt: nowIso,
            ackedByRole: opts.role,
            ackedByDeviceId: opts.deviceId,
          }),
          locationAckHistory: nextHistory,
        },
      },
    })

    acknowledgedCount += 1
    events.push({
      childId: child.id,
      sendId: loc.sendId,
      ackedAt: nowIso,
      ackedByRole: opts.role,
      ackedByDeviceId: opts.deviceId,
    })
  }

  return { acknowledgedCount, events }
}
