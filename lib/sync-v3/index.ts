import { BrowserDurableSyncStore } from "./durable-store"
import { LocalEventQueue, type EventQueueOptions } from "./event-queue"
import { EventSyncEngine, type SyncEngineOptions } from "./sync-engine"
import type { EventTransport, SyncIdentity } from "./types"

export * from "./clock"
export * from "./durable-store"
export * from "./event-queue"
export * from "./merge"
export * from "./sync-engine"
export * from "./transport"
export * from "./types"

export interface CreateSyncV3Options {
  identity: SyncIdentity
  transport: EventTransport
  queue?: Omit<EventQueueOptions, "identity" | "store">
  engine?: Omit<SyncEngineOptions, "identity" | "queue" | "transport">
}

export function syncV3StorageKey(identity: SyncIdentity): string {
  return `famiapp-sync-v3:${encodeURIComponent(identity.familyId)}:${encodeURIComponent(identity.deviceId)}`
}

/** Creates an isolated, opt-in event stream for one family/device pair. */
export function createSyncV3(options: CreateSyncV3Options): {
  queue: LocalEventQueue
  engine: EventSyncEngine
} {
  const queue = new LocalEventQueue({
    ...options.queue,
    identity: options.identity,
    store: new BrowserDurableSyncStore(syncV3StorageKey(options.identity)),
  })
  const engine = new EventSyncEngine({
    ...options.engine,
    identity: options.identity,
    queue,
    transport: options.transport,
  })
  return { queue, engine }
}
