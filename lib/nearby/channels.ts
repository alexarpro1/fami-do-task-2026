/**
 * Nähe-Kanäle auf dem gemeinsamen Transport.
 * sync = Familien-Sync (WLAN-Bulk bevorzugt; kontrollierter BLE-Bulk/Relay erlaubt).
 * game/exchange = JSON-Payloads außerhalb der Sync-Queue (WLAN + BLE Discovery).
 * control = kurze Presence/Digest-Frames (BLE Discovery → WLAN-Upgrade / Relay-Meta).
 */
export type NearbyChannel = "sync" | "game" | "exchange" | "control"

export const NEARBY_CHANNELS = ["sync", "game", "exchange", "control"] as const

export function isNearbyChannel(value: unknown): value is NearbyChannel {
  return (
    value === "sync" ||
    value === "game" ||
    value === "exchange" ||
    value === "control"
  )
}

/** Default für fehlendes / ungültiges channel-Feld (Rückwärtskompatibilität). */
export function normalizeNearbyChannel(value: unknown): NearbyChannel {
  return isNearbyChannel(value) ? value : "sync"
}

export interface NearbyWireFrame {
  channel: NearbyChannel
  data: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Sync bleibt unverpackt (bestehende pair-init / event JSON-Strings).
 * game/exchange/control werden als channel+data-Frame gerahmt.
 */
export function encodeNearbyFrame(channel: NearbyChannel, data: string): string {
  if (channel === "sync") return data
  const frame: NearbyWireFrame = { channel, data }
  return JSON.stringify(frame)
}

/**
 * Demultiplexiert einen Wire-String.
 * - Explizites channel + data → demux
 * - Fehlt channel / unbekannt → gesamter String = sync (Legacy)
 */
export function decodeNearbyFrame(raw: string): NearbyWireFrame {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !isNearbyChannel(parsed.channel)) {
      return { channel: "sync", data: raw }
    }
    if (typeof parsed.data === "string") {
      return { channel: parsed.channel, data: parsed.data }
    }
    // Explizites channel ohne data-String: Sync-Legacy mit versehentlichem Feld vermeiden —
    // nur game/exchange akzeptieren Objekt-Payloads als serialisierten Body.
    if (parsed.channel === "sync") {
      return { channel: "sync", data: raw }
    }
    if (parsed.data !== undefined) {
      return { channel: parsed.channel, data: JSON.stringify(parsed.data) }
    }
    if ("payload" in parsed) {
      const payload = parsed.payload
      return {
        channel: parsed.channel,
        data: typeof payload === "string" ? payload : JSON.stringify(payload ?? null),
      }
    }
    return { channel: parsed.channel, data: raw }
  } catch {
    return { channel: "sync", data: raw }
  }
}
