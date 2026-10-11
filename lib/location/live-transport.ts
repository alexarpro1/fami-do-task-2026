"use client"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import {
  parseLiveAckPayload,
  parseLiveLocationPayload,
} from "@/lib/location/live-payload-guard"

export type LiveLocationPayload = {
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

export type LiveAckPayload = {
  syncId: string
  childId: string
  sendId: string
  ackedAt: string
  ackedByRole: "parent" | "master"
  ackedByDeviceId?: string
  deviceId?: string
}

type TransportMessage =
  | { kind: "location"; payload: LiveLocationPayload }
  | { kind: "ack"; payload: LiveAckPayload }

type Listener = (message: TransportMessage) => void

const BC_CHANNEL_PREFIX = "famiapp-live-location"
const SUPABASE_CHANNEL_PREFIX = "famiapp-live-location"
const EVENT_LOCATION = "live-location"
const EVENT_ACK = "live-ack"

function sanitizeSyncId(syncId: string): string {
  return (syncId || "local").replace(/[^a-zA-Z0-9_-]/g, "_")
}

export function createLiveTransport(syncId: string) {
  const listeners = new Set<Listener>()
  const seenMessageKeys = new Set<string>()
  const safeSyncId = sanitizeSyncId(syncId)
  const bcName = `${BC_CHANNEL_PREFIX}:${safeSyncId}`
  const supabaseChannelName = `${SUPABASE_CHANNEL_PREFIX}:${safeSyncId}`

  const bc =
    typeof window !== "undefined" && "BroadcastChannel" in window
      ? new BroadcastChannel(bcName)
      : null

  let supabaseChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null

  const emit = (msg: TransportMessage) => {
    const key =
      msg.kind === "location"
        ? `loc:${msg.payload.sendId}`
        : `ack:${msg.payload.sendId}:${msg.payload.ackedAt}`
    if (seenMessageKeys.has(key)) return
    seenMessageKeys.add(key)
    if (seenMessageKeys.size > 500) {
      const first = seenMessageKeys.values().next().value
      if (first) seenMessageKeys.delete(first)
    }
    for (const listener of listeners) listener(msg)
  }

  const acceptIncoming = (raw: unknown, kind: "location" | "ack") => {
    if (kind === "location") {
      const payload = parseLiveLocationPayload(raw, syncId)
      if (!payload) return
      emit({ kind: "location", payload })
      return
    }
    const payload = parseLiveAckPayload(raw, syncId)
    if (!payload) return
    emit({ kind: "ack", payload })
  }

  if (bc) {
    bc.onmessage = (ev: MessageEvent<TransportMessage>) => {
      const msg = ev.data
      if (!msg || (msg.kind !== "location" && msg.kind !== "ack")) return
      acceptIncoming(msg.payload, msg.kind)
    }
  }

  /**
   * Broadcast-Channel ohne Anonymous Auth (wie Audio-Metered-Fallback).
   * Auth-Fehler („Failed to fetch“) sollen Location nicht blockieren –
   * lokal bleibt BroadcastChannel, Cloud ist best-effort.
   */
  const attachSupabase = async () => {
    if (!isSupabaseConfigured()) return
    try {
      const supabase = createClient()
      supabaseChannel = supabase.channel(supabaseChannelName, {
        config: { broadcast: { self: true } },
      })
      supabaseChannel
        .on("broadcast", { event: EVENT_LOCATION }, ({ payload }: { payload: unknown }) => {
          acceptIncoming(payload, "location")
        })
        .on("broadcast", { event: EVENT_ACK }, ({ payload }: { payload: unknown }) => {
          acceptIncoming(payload, "ack")
        })
        .subscribe((status: string) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[live-transport] Supabase channel", status, "– lokal weiter über BroadcastChannel")
            try {
              void supabase.removeChannel(supabaseChannel!)
            } catch {
              // ignore
            }
            supabaseChannel = null
          }
        })
    } catch (e) {
      console.warn("[live-transport] Supabase übersprungen:", e instanceof Error ? e.message : e)
      supabaseChannel = null
    }
  }

  void attachSupabase()

  const publishLocation = async (payload: LiveLocationPayload) => {
    const safe = parseLiveLocationPayload(payload, syncId)
    if (!safe) {
      console.warn("[live-transport] publishLocation rejected: invalid payload or syncId mismatch")
      return
    }
    const msg: TransportMessage = { kind: "location", payload: safe }
    bc?.postMessage(msg)
    emit(msg)
    if (supabaseChannel) {
      await supabaseChannel.send({
        type: "broadcast",
        event: EVENT_LOCATION,
        payload: safe,
      })
    }
  }

  const publishAck = async (payload: LiveAckPayload) => {
    const safe = parseLiveAckPayload(payload, syncId)
    if (!safe) {
      console.warn("[live-transport] publishAck rejected: invalid payload or syncId mismatch")
      return
    }
    const msg: TransportMessage = { kind: "ack", payload: safe }
    bc?.postMessage(msg)
    emit(msg)
    if (supabaseChannel) {
      await supabaseChannel.send({
        type: "broadcast",
        event: EVENT_ACK,
        payload: safe,
      })
    }
  }

  const subscribe = (listener: Listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const dispose = () => {
    listeners.clear()
    try {
      bc?.close()
    } catch {
      // ignore
    }
    if (supabaseChannel) {
      try {
        const supabase = createClient()
        void supabase.removeChannel(supabaseChannel)
      } catch {
        // ignore
      }
    }
  }

  return { publishLocation, publishAck, subscribe, dispose }
}
