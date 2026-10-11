"use client"

import { useCallback, useEffect, useRef } from "react"
import { useFamily } from "@/context/family-context"
import { useDeviceRole } from "@/hooks/useDeviceRole"
import { getDeviceId } from "@/hooks/useSyncSession"
import { useSyncId } from "@/hooks/useSyncId"
import { acknowledgeAllPendingLocations } from "@/lib/location/acknowledge-pending-locations"

/**
 * Eltern-/Master-Gerät bestätigt empfangene Standort-Sendungen (ACK),
 * damit Kind-Geräte ein belastbares Empfangsfeedback statt nur lokaler Fehlertexte haben.
 */
export function ChildLocationAckRunner() {
  const { state, dispatch } = useFamily()
  const { syncId } = useSyncId()
  const [role, , hydrated] = useDeviceRole()
  const stateRef = useRef(state)
  stateRef.current = state

  const acknowledgePendingSignals = useCallback(() => {
    if (typeof window === "undefined" || !hydrated) return
    if (role !== "parent" && role !== "master") return
    const s = stateRef.current
    const deviceId = getDeviceId()
    const ackRole = role === "master" ? "master" : "parent"
    const { events } = acknowledgeAllPendingLocations(s.children, dispatch, {
      role: ackRole,
      deviceId: deviceId || undefined,
    })
    if (!syncId) return
    for (const ev of events) {
      window.dispatchEvent(
        new CustomEvent("famiapp:live-ack-outgoing", {
          detail: {
            syncId,
            childId: ev.childId,
            sendId: ev.sendId,
            ackedAt: ev.ackedAt,
            ackedByRole: ev.ackedByRole,
            ackedByDeviceId: ev.ackedByDeviceId,
            deviceId: deviceId || undefined,
          },
        }),
      )
    }
  }, [dispatch, hydrated, role, syncId])

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return
    if (role !== "parent" && role !== "master") return
    acknowledgePendingSignals()
    const interval = window.setInterval(acknowledgePendingSignals, 10_000)
    const onVis = () => {
      if (document.visibilityState === "visible") acknowledgePendingSignals()
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [acknowledgePendingSignals, hydrated, role])

  useEffect(() => {
    if (!hydrated) return
    if (role !== "parent" && role !== "master") return
    acknowledgePendingSignals()
  }, [state.children, acknowledgePendingSignals, hydrated, role])

  return null
}
