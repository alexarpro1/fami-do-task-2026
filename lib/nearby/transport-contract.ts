/**
 * Transport-Naht: Discovery (klein/häufig) vs Bulk (groß/selten) vs Relay (BLE Multi-Hop).
 *
 * Bestehende Sessions (`NearbyWlanSession` / `NearbyBluetoothSession`) bleiben die
 * Laufzeit-Adapter; Dual-Radio: `dual-radio-coordinator.ts` verdrahtet
 * announce / upgradeToBulk / sendControl / BLE-Bulk+Relay.
 *
 * Limits sind an bestehende Werte gebunden — nicht willkürlich neu gesetzt.
 */

import { MAX_WIRE_BYTES } from "@/lib/local-sync/protocol"
import type { DiscoveredPeer } from "@/lib/local-sync/types"
import type { NearbyChannel } from "./channels"

export type NearbyTransportKind = "wlan" | "ble"

/**
 * Discovery = Präsenz/Control; Bulk = Sync-v3 / große Payloads;
 * Relay = kontrolliertes Weiterleiten von Sync-Batches über Familien-Peers (BLE).
 */
export type NearbyTransportRole = "discovery" | "bulk" | "relay"

/**
 * Minimaler Präsenz-Digest für BLE-Control / Store-and-Forward / Multi-Hop.
 * Kein Klartext-Family-State — nur Fingerprints/Hashes + optionaler LAN-Hint.
 */
export interface PresenceDigest {
  deviceId: string
  /** Kurzer Familien-/Pairing-Fingerprint (kein State). */
  familyFingerprint: string
  /** Sync-v3: Hash lokaler pending Outbound-Events (leer = nichts pending). */
  queueHash: string
  wantsBulk: boolean
  lanHint?: {
    host?: string
    port?: number
    serviceId?: string
  }
  /**
   * Kurzlebiger Native-Pairing-Token für WLAN-Raw-Connect / Dual-Radio-Handoff.
   * Bevorzugt gemintet: `dpt1` + exp36 + mac (gebunden an family+device+expiry).
   * Legacy: opaques Host-Token. Ersetzt nicht ECDH/QR für Sync-v3.
   */
  pairingToken?: string
  /** Peer kann BLE-Bulk / Relay (ohne gemeinsames WLAN). */
  bleBulkCapable?: boolean
  /**
   * Kompakter ECDH-P-256 Public Key (`x.y` base64url) für Relay-E2E A↔C.
   * Kurz halten — gesamter Control-Frame ≤ NEARBY_BLE_CONTROL_MAX_BYTES.
   */
  e2ePk?: string
}

/** WLAN- oder BLE-Bulk-Session. */
export interface NearbyBulkSession {
  close(): Promise<void>
  readonly transportKind?: NearbyTransportKind
}

/**
 * Ziel-Vertrag Discovery vs Bulk vs Relay.
 * Sessions erfüllen send/onMessage; Adapter in `dual-radio-coordinator.ts`
 * implementieren announce / upgradeToBulk / sendControl.
 */
export interface NearbyTransport {
  readonly kind: NearbyTransportKind
  readonly roles: readonly NearbyTransportRole[]
  startDiscovery(
    onPeer: (peer: DiscoveredPeer) => void,
    onPeerLost?: (peer: DiscoveredPeer) => void,
  ): Promise<() => Promise<void>>
  announce(digest: PresenceDigest): Promise<void>
  /** BLE → WLAN: nach Match Token + lanHint → LocalNetworkSync.connect */
  upgradeToBulk(
    peer: Pick<DiscoveredPeer, "host" | "port" | "peerId">,
    pairingToken: string,
    deviceId: string,
  ): Promise<NearbyBulkSession>
  /** Kurze Control-/Digest-Frames (≤ NEARBY_BLE_CONTROL_MAX_BYTES auf BLE). */
  sendControl(payload: string | object): Promise<void>
}

/** Metadaten, die jede laufende Session heute schon tragen kann. */
export interface NearbyTransportCapabilities {
  readonly kind: NearbyTransportKind
  readonly roles: readonly NearbyTransportRole[]
}

/** BLE: Discovery + kontrollierter Bulk/Relay (kein öffentliches Mesh). */
export const BLE_TRANSPORT_ROLES = [
  "discovery",
  "bulk",
  "relay",
] as const satisfies readonly NearbyTransportRole[]

export const WLAN_TRANSPORT_ROLES = [
  "discovery",
  "bulk",
] as const satisfies readonly NearbyTransportRole[]

/** game/exchange/control (Discovery); sync über WLAN-Bulk oder kontrollierten BLE-Pfad. */
export const NEARBY_DISCOVERY_CHANNELS = [
  "game",
  "exchange",
  "control",
] as const satisfies readonly NearbyChannel[]

export const NEARBY_BULK_CHANNELS = [
  "sync",
  "game",
  "exchange",
  "control",
] as const satisfies readonly NearbyChannel[]

// ─── Limits (bestehende Quellen) ─────────────────────────────────────────────

/** Sync-v3 Push-Ack-Timeout (`lib/local-sync/sync-v3-transport.ts`). */
export const NEARBY_BULK_REQUEST_TIMEOUT_MS = 8_000

/** Sync-v3 max. Events pro Push/Pull/Ack (`sync-v3-transport.ts`). */
export const NEARBY_MAX_BATCH_EVENTS = 100

/** NSD/BLE Discovery-Fenster (Native DEFAULT_DISCOVERY_MS, LAN/BLE TS). */
export const NEARBY_DISCOVERY_TIMEOUT_MS = 15_000

/** Native LAN-Connect-Wartezeit (`lib/local-sync/transport.ts`). */
export const NEARBY_WLAN_CONNECT_TIMEOUT_MS = 15_000

/** BLE-GATT-Connect-Wartezeit (`bluetooth-session.ts`). */
export const NEARBY_BLE_CONNECT_TIMEOUT_MS = 20_000

/**
 * Soft-Max für BLE Control/Presence/Digest (TS-Policy).
 * Native ATT chunkt ohnehin (Default-Payload 20 B, Header 4 B).
 * Nicht auf game/exchange anwenden — Bretter können größer sein.
 */
export const NEARBY_BLE_CONTROL_MAX_BYTES = 512

/** Default ATT-Nutzlast vor MTU-Negotiate (`BluetoothNearbyPlugin.DEFAULT_ATT_PAYLOAD`). */
export const NEARBY_BLE_DEFAULT_ATT_PAYLOAD = 20

/** Chunk-Header-Bytes (`BluetoothNearbyPlugin.CHUNK_HEADER`). */
export const NEARBY_BLE_CHUNK_HEADER_BYTES = 4

/** WLAN-Wire-Max (`lib/local-sync/protocol.ts` MAX_WIRE_BYTES). */
export const NEARBY_BULK_MAX_WIRE_BYTES = MAX_WIRE_BYTES

const utf8 = typeof TextEncoder !== "undefined" ? new TextEncoder() : null

export function utf8ByteLength(value: string): number {
  if (utf8) return utf8.encode(value).byteLength
  // Fallback (sehr alte Environments): UTF-16-Länge als grobe Obergrenze vermeiden
  let bytes = 0
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3
  }
  return bytes
}

export function getTransportRoles(kind: NearbyTransportKind): readonly NearbyTransportRole[] {
  return kind === "ble" ? BLE_TRANSPORT_ROLES : WLAN_TRANSPORT_ROLES
}

export function supportsBulkRole(kind: NearbyTransportKind): boolean {
  return kind === "wlan" || kind === "ble"
}

export function supportsRelayRole(kind: NearbyTransportKind): boolean {
  return kind === "ble"
}

/**
 * Kanal-Policy: Sync auf BLE ist für kontrollierten Familien-Bulk/Relay erlaubt.
 * Games/Exchange bleiben unverändert auf beiden Transporten.
 */
export function isChannelAllowedOnTransport(
  kind: NearbyTransportKind,
  channel: NearbyChannel,
): boolean {
  void kind
  void channel
  return true
}

/**
 * Policy: Sync auf BLE = kontrollierter Familien-Pfad (Direct + Multi-Hop Relay).
 * WLAN-Bulk bleibt bevorzugt, wenn lanHint verfügbar ist.
 */
export function assertChannelAllowedOnTransport(
  kind: NearbyTransportKind,
  channel: NearbyChannel,
): void {
  if (!isChannelAllowedOnTransport(kind, channel)) {
    throw new Error(`Kanal ${channel} ist auf Transport ${kind} nicht erlaubt`)
  }
}

/** sendControl / announce — nicht für game/exchange/sync. */
export function assertBleControlSize(payload: string): void {
  if (utf8ByteLength(payload) > NEARBY_BLE_CONTROL_MAX_BYTES) {
    throw new Error(
      `BLE-Control-Nachricht überschreitet ${NEARBY_BLE_CONTROL_MAX_BYTES} Bytes`,
    )
  }
}

export function serializePresenceDigest(digest: PresenceDigest): string {
  const body: Record<string, unknown> = {
    deviceId: digest.deviceId,
    familyFingerprint: digest.familyFingerprint,
    queueHash: digest.queueHash,
    wantsBulk: digest.wantsBulk,
  }
  if (digest.lanHint) body.lanHint = digest.lanHint
  if (digest.pairingToken) body.pairingToken = digest.pairingToken
  if (digest.bleBulkCapable !== undefined) body.bleBulkCapable = digest.bleBulkCapable
  if (digest.e2ePk) body.e2ePk = digest.e2ePk
  return JSON.stringify(body)
}

export function parsePresenceDigest(raw: unknown): PresenceDigest | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null
  const value = raw as Record<string, unknown>
  if (typeof value.deviceId !== "string" || value.deviceId.length < 1) return null
  if (typeof value.familyFingerprint !== "string") return null
  if (typeof value.queueHash !== "string") return null
  if (typeof value.wantsBulk !== "boolean") return null
  let lanHint: PresenceDigest["lanHint"]
  if (value.lanHint !== undefined) {
    if (typeof value.lanHint !== "object" || value.lanHint === null || Array.isArray(value.lanHint)) {
      return null
    }
    const hint = value.lanHint as Record<string, unknown>
    lanHint = {
      host: typeof hint.host === "string" ? hint.host : undefined,
      port: typeof hint.port === "number" && Number.isFinite(hint.port) ? hint.port : undefined,
      serviceId: typeof hint.serviceId === "string" ? hint.serviceId : undefined,
    }
  }
  const pairingToken =
    typeof value.pairingToken === "string" && value.pairingToken.length > 0
      ? value.pairingToken
      : undefined
  const bleBulkCapable =
    typeof value.bleBulkCapable === "boolean" ? value.bleBulkCapable : undefined
  const e2ePk =
    typeof value.e2ePk === "string" && value.e2ePk.includes(".") && value.e2ePk.length >= 80
      ? value.e2ePk
      : undefined
  return {
    deviceId: value.deviceId,
    familyFingerprint: value.familyFingerprint,
    queueHash: value.queueHash,
    wantsBulk: value.wantsBulk,
    ...(lanHint ? { lanHint } : {}),
    ...(pairingToken ? { pairingToken } : {}),
    ...(bleBulkCapable !== undefined ? { bleBulkCapable } : {}),
    ...(e2ePk ? { e2ePk } : {}),
  }
}
