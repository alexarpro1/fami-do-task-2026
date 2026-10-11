"use client"

import { useEffect, useRef } from "react"
import { useFamily } from "@/context/family-context"
import { useSyncId } from "@/hooks/useSyncId"
import { getDeviceId } from "@/hooks/useSyncSession"
import { createLiveTransport, type LiveAckPayload, type LiveLocationPayload } from "@/lib/location/live-transport"
import {
  childExistsInList,
  parseLiveAckPayload,
  parseLiveLocationPayload,
} from "@/lib/location/live-payload-guard"
import { appendLocationHistoryEntry, applyAckToLocationHistory } from "@/lib/location/location-history"

export function LiveLocationTransportRunner() {
  const { syncId } = useSyncId()
  const { state, dispatch } = useFamily()
  const stateRef = useRef(state)
  stateRef.current = state
  const transportRef = useRef<ReturnType<typeof createLiveTransport> | null>(null)

  useEffect(() => {
    if (!syncId) return
    const transport = createLiveTransport(syncId)
    transportRef.current = transport
    const localDeviceId = getDeviceId()

    const unsub = transport.subscribe((message) => {
      if (message.kind === "location") {
        const payload = parseLiveLocationPayload(message.payload, syncId)
        if (!payload) return
        if (!childExistsInList(stateRef.current.children, payload.childId)) return
        if (payload.deviceId && localDeviceId && payload.deviceId === localDeviceId) return
        const current = (stateRef.current.children ?? []).find((c) => c.id === payload.childId)
        const currentSendId = current?.lastSharedLocation?.sendId
        if (currentSendId === payload.sendId) return
        dispatch({
          type: "UPDATE_CHILD",
          payload: {
            id: payload.childId,
            updates: {
              lastSharedLocation: {
                lat: payload.lat,
                lon: payload.lon,
                accuracyM: payload.accuracyM,
                sentAt: payload.sentAt,
                source: payload.source,
                sendId: payload.sendId,
                recordedAt: payload.recordedAt,
              },
              locationHistory: appendLocationHistoryEntry(current?.locationHistory, {
                sendId: payload.sendId,
                lat: payload.lat,
                lon: payload.lon,
                accuracyM: payload.accuracyM,
                recordedAt: payload.recordedAt,
                sentAt: payload.sentAt,
                source: payload.source,
              }),
            },
          },
        })
        return
      }

      const payload = parseLiveAckPayload(message.payload, syncId)
      if (!payload) return
      if (payload.deviceId && localDeviceId && payload.deviceId === localDeviceId) return
      const current = (stateRef.current.children ?? []).find((c) => c.id === payload.childId)
      const loc = current?.lastSharedLocation
      if (!current || !loc || loc.sendId !== payload.sendId) return
      if (loc.ackedAt && loc.ackedAt === payload.ackedAt) return
      const history = current.locationAckHistory ?? []
      const alreadyLogged = history.some((h) => h.sendId === payload.sendId && h.ackedAt === payload.ackedAt)
      const nextHistory = alreadyLogged
        ? history
        : [
            {
              sendId: payload.sendId,
              ackedAt: payload.ackedAt,
              ackedByRole: payload.ackedByRole,
              ackedByDeviceId: payload.ackedByDeviceId,
              auto: true as const,
            },
            ...history,
          ].slice(0, 30)
      dispatch({
        type: "UPDATE_CHILD",
        payload: {
          id: payload.childId,
          updates: {
            lastSharedLocation: {
              ...loc,
              ackedAt: payload.ackedAt,
              ackedByRole: payload.ackedByRole,
              ackedByDeviceId: payload.ackedByDeviceId,
            },
            locationHistory: applyAckToLocationHistory(current.locationHistory, {
              sendId: payload.sendId,
              ackedAt: payload.ackedAt,
              ackedByRole: payload.ackedByRole,
              ackedByDeviceId: payload.ackedByDeviceId,
            }),
            locationAckHistory: nextHistory,
          },
        },
      })
    })

    const onOutgoingLocation = (ev: Event) => {
      const detail = (ev as CustomEvent<LiveLocationPayload>).detail
      const safe = parseLiveLocationPayload(detail, syncId)
      if (!safe) return
      void transport.publishLocation(safe)
    }
    const onOutgoingAck = (ev: Event) => {
      const detail = (ev as CustomEvent<LiveAckPayload>).detail
      const safe = parseLiveAckPayload(detail, syncId)
      if (!safe) return
      void transport.publishAck(safe)
    }
    window.addEventListener("famiapp:live-location-outgoing", onOutgoingLocation as EventListener)
    window.addEventListener("famiapp:live-ack-outgoing", onOutgoingAck as EventListener)

    return () => {
      unsub()
      window.removeEventListener("famiapp:live-location-outgoing", onOutgoingLocation as EventListener)
      window.removeEventListener("famiapp:live-ack-outgoing", onOutgoingAck as EventListener)
      transport.dispose()
      if (transportRef.current === transport) transportRef.current = null
    }
  }, [syncId, dispatch])

  return null
}
