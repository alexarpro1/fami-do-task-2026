import { LocalNetworkSync } from "./local-network-sync"
import { getSharedLocalRawTransport } from "./transport"

interface SharedRuntime {
  client: LocalNetworkSync
}

const runtimes = new Map<string, SharedRuntime>()

function runtimeKey(familyId: string, deviceId: string): string {
  return `${encodeURIComponent(familyId)}:${encodeURIComponent(deviceId)}`
}

export function getLocalNetworkSyncRuntime(familyId: string, deviceId: string): LocalNetworkSync {
  const key = runtimeKey(familyId, deviceId)
  const existing = runtimes.get(key)
  if (existing) return existing.client
  const client = new LocalNetworkSync({
    familyId,
    deviceId,
    // Gemeinsamer Raw-Transport mit lib/nearby (game/exchange-Kanäle).
    transport: getSharedLocalRawTransport(),
  })
  runtimes.set(key, { client })
  return client
}

export { getSharedLocalRawTransport } from "./transport"
