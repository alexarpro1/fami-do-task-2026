/**
 * Familien-Anruf-Einladung über Metered Realtime (leichtgewichtiges Pub/Sub).
 * Empfänger (App offen/Hintergrund mit JS) bekommen Local Notification.
 * App komplett geschlossen → später FCM nötig.
 */

import { SignallingClient } from "@metered-ca/realtime"
import {
  getMeteredRealtimeApiKey,
  isMeteredRealtimeConfigured,
} from "@/lib/webrtc/metered-config"

export type CallInvitePayload = {
  v: 1
  t: "call-invite"
  syncId: string
  roomId: string
  fromName: string
  fromDeviceId?: string
  createdAt: number
}

export function callInviteChannel(syncId: string): string {
  const safe = (syncId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)
  return `fami-call-invite-${safe || "local"}`
}

export function isCallInvitePayload(raw: unknown): raw is CallInvitePayload {
  if (!raw || typeof raw !== "object") return false
  const o = raw as Record<string, unknown>
  return (
    o.v === 1 &&
    o.t === "call-invite" &&
    typeof o.syncId === "string" &&
    typeof o.roomId === "string" &&
    typeof o.fromName === "string" &&
    typeof o.createdAt === "number" &&
    (o.fromDeviceId === undefined || typeof o.fromDeviceId === "string")
  )
}

/** Einmalig Einladung an alle Geräte der Familie (gleiche Sync-ID) senden. */
export async function publishCallInvite(opts: {
  syncId: string
  roomId: string
  fromName: string
  fromDeviceId?: string
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isMeteredRealtimeConfigured()) {
    return { ok: false, reason: "Metered Realtime nicht konfiguriert" }
  }
  const syncId = opts.syncId.trim().toUpperCase()
  const roomId = opts.roomId.trim()
  if (!syncId || !roomId) return { ok: false, reason: "Sync-/Raum-ID fehlt" }

  const apiKey = getMeteredRealtimeApiKey()!
  const channel = callInviteChannel(syncId)
  const client = new SignallingClient({ apiKey })

  const payload: CallInvitePayload = {
    v: 1,
    t: "call-invite",
    syncId,
    roomId,
    fromName: opts.fromName.slice(0, 40) || "Familie",
    fromDeviceId: opts.fromDeviceId?.slice(0, 64),
    createdAt: Date.now(),
  }

  try {
    await client.connect()
    await client.subscribe(channel)
    await client.publish(channel, payload)
    await client.close()
    return { ok: true }
  } catch (e) {
    try {
      await client.close()
    } catch {
      // ignore
    }
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

type InviteHandler = (invite: CallInvitePayload) => void

/**
 * Dauerhaftes Lauschen auf Anruf-Einladungen (eine Verbindung pro App).
 * close() beim Unmount aufrufen.
 */
export function createCallInviteListener(opts: {
  syncId: string
  onInvite: InviteHandler
}): { close: () => void } {
  let closed = false
  let client: SignallingClient | null = null

  const run = async () => {
    if (!isMeteredRealtimeConfigured()) return
    const syncId = opts.syncId.trim().toUpperCase()
    if (!syncId) return

    const apiKey = getMeteredRealtimeApiKey()!
    const channel = callInviteChannel(syncId)
    client = new SignallingClient({ apiKey })

    const onMessage = ({ data }: { data: unknown }) => {
      if (!isCallInvitePayload(data)) return
      if (data.syncId.toUpperCase() !== syncId) return
      // Sehr alte Invites ignorieren (> 2 Min)
      if (Date.now() - data.createdAt > 120_000) return
      opts.onInvite(data)
    }

    try {
      client.on("message", onMessage)
      await client.connect()
      if (closed) {
        await client.close()
        return
      }
      await client.subscribe(channel)
    } catch (e) {
      console.warn("[call-invite] listener:", e instanceof Error ? e.message : e)
      try {
        await client?.close()
      } catch {
        // ignore
      }
      client = null
    }
  }

  void run()

  return {
    close: () => {
      closed = true
      const c = client
      client = null
      if (c) void c.close().catch(() => {})
    },
  }
}
