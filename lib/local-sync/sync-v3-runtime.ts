import { createSyncV3, type EventSyncEngine, type LocalEventQueue, type SyncIdentity } from "../sync-v3"
import type { GenericSyncTransport } from "./types"
import { LocalNetworkEventTransport } from "./sync-v3-transport"

export interface LocalSyncV3Runtime {
  transport: LocalNetworkEventTransport
  queue: LocalEventQueue
  engine: EventSyncEngine
}

const runtimes = new Map<string, LocalSyncV3Runtime>()

export function getLocalSyncV3Runtime(
  channel: GenericSyncTransport,
  identity: SyncIdentity,
): LocalSyncV3Runtime {
  const key = `${encodeURIComponent(identity.familyId)}:${encodeURIComponent(identity.deviceId)}`
  const existing = runtimes.get(key)
  if (existing) return existing
  const transport = new LocalNetworkEventTransport(channel, identity.familyId)
  const { queue, engine } = createSyncV3({
    identity,
    transport,
    engine: { pushBatchSize: 20, pullBatchSize: 100 },
  })
  transport.setReceiver(async (events) => {
    await queue.applyRemote(events)
  })
  const runtime = { transport, queue, engine }
  runtimes.set(key, runtime)
  return runtime
}
