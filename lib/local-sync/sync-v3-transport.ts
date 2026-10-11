import {
  NEARBY_BULK_REQUEST_TIMEOUT_MS,
  NEARBY_MAX_BATCH_EVENTS,
} from "@/lib/nearby/transport-contract"
import { isSyncEvent } from "../sync-v3/merge"
import type {
  EventTransport,
  PullRequest,
  PullResponse,
  PushRequest,
  PushResponse,
  SyncEvent as SyncV3Event,
} from "../sync-v3/types"
import { randomBase64Url } from "./protocol"
import type { GenericSyncTransport, SyncEvent } from "./types"

const WIRE_EVENT_TYPE = "sync-v3"
/** @see NEARBY_BULK_REQUEST_TIMEOUT_MS — gemeinsame Bulk-Timeout-Naht */
const REQUEST_TIMEOUT_MS = NEARBY_BULK_REQUEST_TIMEOUT_MS
/** @see NEARBY_MAX_BATCH_EVENTS */
const MAX_BATCH_EVENTS = NEARBY_MAX_BATCH_EVENTS

type LanSyncV3WireMessage =
  | { kind: "push"; requestId: string; familyId: string; deviceId: string; events: SyncV3Event[] }
  | { kind: "push-result"; requestId: string; acknowledgedEventIds: string[]; error?: string }
  | { kind: "ack"; familyId: string; deviceId: string; eventIds: string[] }

interface SecureEventChannel extends GenericSyncTransport {}

interface PendingPush {
  resolve: (response: PushResponse) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedStrings(value: unknown, limit = MAX_BATCH_EVENTS): string[] {
  if (!Array.isArray(value) || value.length > limit) return []
  return value.filter((item): item is string => typeof item === "string" && item.length > 0)
}

/**
 * EventTransport über den bereits ECDH/HKDF/AES-GCM-geschützten LAN-Kanal.
 * Der native Socket authentifiziert Frames zusätzlich mit HMAC und Sequenznummer.
 */
export class LocalNetworkEventTransport implements EventTransport {
  private readonly inbox = new Map<string, SyncV3Event>()
  private readonly pending = new Map<string, PendingPush>()
  private readonly unsubscribe: () => void
  private receiveEvents: ((events: SyncV3Event[]) => Promise<void>) | null = null

  constructor(
    private readonly channel: SecureEventChannel,
    private readonly familyId: string,
  ) {
    this.unsubscribe = channel.subscribe((event) => {
      if (event.type === WIRE_EVENT_TYPE) {
        void this.handleWireEvent(event).catch((error) => {
          console.warn("[LocalNetworkEventTransport] Eingehendes Event abgelehnt", error)
        })
      }
    })
  }

  setReceiver(receiver: (events: SyncV3Event[]) => Promise<void>): void {
    this.receiveEvents = receiver
  }

  async push(request: PushRequest): Promise<PushResponse> {
    if (request.familyId !== this.familyId) throw new Error("LAN-Familien-ID stimmt nicht überein")
    if (request.events.length > MAX_BATCH_EVENTS) throw new Error("LAN-Event-Batch ist zu groß")
    if (this.channel.getState().phase !== "connected") throw new Error("LAN nicht verbunden")
    const requestId = randomBase64Url(18)
    const response = new Promise<PushResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error("LAN-Push wurde nicht bestätigt"))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(requestId, { resolve, reject, timeout })
    })
    try {
      await this.channel.send<LanSyncV3WireMessage>(WIRE_EVENT_TYPE, {
        kind: "push",
        requestId,
        familyId: request.familyId,
        deviceId: request.deviceId,
        events: request.events,
      })
      return await response
    } catch (error) {
      const pending = this.pending.get(requestId)
      if (pending) clearTimeout(pending.timeout)
      this.pending.delete(requestId)
      throw error
    }
  }

  async pull(request: PullRequest): Promise<PullResponse> {
    if (request.familyId !== this.familyId) throw new Error("LAN-Familien-ID stimmt nicht überein")
    const events = [...this.inbox.values()]
      .filter((event) => event.deviceId !== request.deviceId)
      .slice(0, Math.max(0, Math.min(request.limit, MAX_BATCH_EVENTS)))
    return { events, hasMore: this.inbox.size > events.length }
  }

  async acknowledge(familyId: string, deviceId: string, eventIds: string[]): Promise<void> {
    if (familyId !== this.familyId) throw new Error("LAN-Familien-ID stimmt nicht überein")
    const bounded = eventIds.slice(0, MAX_BATCH_EVENTS)
    for (const eventId of bounded) this.inbox.delete(eventId)
    if (this.channel.getState().phase === "connected") {
      await this.channel.send<LanSyncV3WireMessage>(WIRE_EVENT_TYPE, {
        kind: "ack",
        familyId,
        deviceId,
        eventIds: bounded,
      })
    }
  }

  dispose(): void {
    this.unsubscribe()
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(new Error("LAN-EventTransport wurde beendet"))
    }
    this.pending.clear()
    this.inbox.clear()
  }

  private async handleWireEvent(event: SyncEvent): Promise<void> {
    if (!isRecord(event.payload)) return
    const payload = event.payload
    if (payload.kind === "push-result") {
      const requestId = typeof payload.requestId === "string" ? payload.requestId : ""
      const pending = this.pending.get(requestId)
      if (!pending) return
      clearTimeout(pending.timeout)
      this.pending.delete(requestId)
      if (typeof payload.error === "string") pending.reject(new Error(payload.error))
      else pending.resolve({ acknowledgedEventIds: boundedStrings(payload.acknowledgedEventIds) })
      return
    }
    if (payload.kind === "ack") return
    if (payload.kind !== "push") return

    const requestId = typeof payload.requestId === "string" ? payload.requestId : ""
    const familyId = typeof payload.familyId === "string" ? payload.familyId : ""
    const rawEvents = Array.isArray(payload.events) ? payload.events.slice(0, MAX_BATCH_EVENTS) : []
    const remoteDeviceId = this.channel.getRemoteDeviceId?.() ?? null
    const events = rawEvents.filter(
      (candidate): candidate is SyncV3Event =>
        isSyncEvent(candidate) &&
        candidate.familyId === this.familyId &&
        (!remoteDeviceId || candidate.deviceId === remoteDeviceId),
    )
    // Das aktuelle Domänen-Mapping überträgt Definitionen vom Parent zum Kind.
    // Kind->Parent-Änderungen brauchen eigene, childId-gebundene Ereignistypen;
    // bis dahin fail-closed statt frei manipulierbarer Entity-Patches.
    const roleAllowsInbound = this.channel.getState().role === "child"
    const accepted =
      roleAllowsInbound &&
      familyId === this.familyId &&
      rawEvents.length === events.length
    if (accepted) {
      if (this.receiveEvents) {
        await this.receiveEvents(events)
      } else {
        for (const candidate of events) this.inbox.set(candidate.eventId, candidate)
      }
    }
    await this.channel.send<LanSyncV3WireMessage>(WIRE_EVENT_TYPE, {
      kind: "push-result",
      requestId,
      acknowledgedEventIds: accepted ? events.map((candidate) => candidate.eventId) : [],
      error: accepted
        ? undefined
        : "LAN-Push ist für diese Rolle ungültig oder enthält fremde Events",
    })
  }
}

export interface LanFirstTransportOptions {
  local: EventTransport
  cloud?: EventTransport
  isLocalConnected: () => boolean
  allowCloudFallback?: boolean
}

/**
 * Cloud-Fallback ist absichtlich opt-in. Ohne ausdrückliche Freigabe wird ein
 * LAN-Fehler an die Queue zurückgegeben und dort mit Backoff erneut versucht.
 */
export class LanFirstEventTransport implements EventTransport {
  constructor(private readonly options: LanFirstTransportOptions) {}

  async push(request: PushRequest): Promise<PushResponse> {
    if (this.options.isLocalConnected()) {
      try {
        return await this.options.local.push(request)
      } catch (error) {
        if (!this.options.allowCloudFallback || !this.options.cloud) throw error
      }
    }
    if (this.options.allowCloudFallback && this.options.cloud) return this.options.cloud.push(request)
    throw new Error("LAN nicht verbunden; Cloud-Fallback ist nicht aktiviert")
  }

  async pull(request: PullRequest): Promise<PullResponse> {
    const local = await this.options.local.pull(request)
    if (local.events.length > 0 || !this.options.allowCloudFallback || !this.options.cloud) return local
    return this.options.cloud.pull(request)
  }

  async acknowledge(familyId: string, deviceId: string, eventIds: string[]): Promise<void> {
    await this.options.local.acknowledge?.(familyId, deviceId, eventIds)
    if (this.options.allowCloudFallback && this.options.cloud) {
      await this.options.cloud.acknowledge?.(familyId, deviceId, eventIds)
    }
  }
}
