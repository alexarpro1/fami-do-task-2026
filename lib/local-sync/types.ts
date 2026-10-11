import type { PluginListenerHandle } from "@capacitor/core"
import type { NearbyChannel } from "@/lib/nearby/channels"

export type { NearbyChannel }

export const LOCAL_SYNC_PROTOCOL_VERSION = 1 as const

export type LocalSyncRole = "parent" | "child"

export type LocalSyncPhase =
  | "idle"
  | "discovering"
  | "hosting"
  | "connecting"
  | "pairing"
  | "connected"
  | "reconnecting"
  | "error"
  | "stopped"

export interface LocalSyncState {
  role: LocalSyncRole | null
  phase: LocalSyncPhase
  connectionId: string | null
  peer: DiscoveredPeer | null
  reconnectAttempt: number
  error: string | null
}

export type LocalSyncStateEvent =
  | { type: "DISCOVER"; role: "child" }
  | { type: "HOST"; role: "parent" }
  | { type: "CONNECT"; peer: DiscoveredPeer }
  | { type: "TRANSPORT_CONNECTED"; connectionId: string }
  | { type: "PAIRING_SUCCEEDED" }
  | { type: "CONNECTION_LOST"; reason?: string }
  | { type: "RETRY"; attempt: number }
  | { type: "FAIL"; error: string }
  | { type: "RESET" }
  | { type: "STOP" }

export interface DiscoveredPeer {
  serviceId: string
  peerId?: string
  deviceId?: string
  role?: string
  name: string
  host: string
  port: number
  protocolVersion: number
  fingerprint?: string
}

export interface LocalHostInfo {
  serviceId: string
  host: string
  port: number
}

export interface QrPairingPayload {
  v: typeof LOCAL_SYNC_PROTOCOL_VERSION
  familyId: string
  parentDeviceId: string
  parentFingerprint: string
  parentPublicKey: JsonWebKey
  host: string
  port: number
  token: string
  expiresAt: number
}

export interface PairInitMessage {
  kind: "pair-init"
  v: typeof LOCAL_SYNC_PROTOCOL_VERSION
  childPublicKey: JsonWebKey
  sealed: EncryptedPayload
}

export interface PairInitSecret {
  familyId: string
  childDeviceId: string
  token: string
  childNonce: string
}

export interface PairChallengeMessage {
  kind: "pair-challenge"
  v: typeof LOCAL_SYNC_PROTOCOL_VERSION
  sessionId: string
  parentDeviceId: string
  parentPublicKey: JsonWebKey
  parentNonce: string
  challenge: string
}

export interface PairResponseMessage {
  kind: "pair-response"
  v: typeof LOCAL_SYNC_PROTOCOL_VERSION
  sessionId: string
  proof: EncryptedPayload
}

export interface PairAcceptedMessage {
  kind: "pair-accepted"
  v: typeof LOCAL_SYNC_PROTOCOL_VERSION
  sessionId: string
  proof: EncryptedPayload
}

/**
 * Parent → Child nach Dual-Radio-WLAN-Bulk: gleiche kurzlebige Pairing-Materialien
 * wie der QR-Code (kein Klartext-State). Child startet damit ECDH/pair-init.
 */
export interface PairingInviteMessage {
  kind: "pairing-invite"
  v: typeof LOCAL_SYNC_PROTOCOL_VERSION
  encoded: string
}

/** Child → Parent: Invite erneut senden (Race, wenn Child den ersten Invite verpasst). */
export interface PairingInviteRequestMessage {
  kind: "pairing-invite-request"
  v: typeof LOCAL_SYNC_PROTOCOL_VERSION
}

export type PairingWireMessage =
  | PairInitMessage
  | PairChallengeMessage
  | PairResponseMessage
  | PairAcceptedMessage
  | PairingInviteMessage
  | PairingInviteRequestMessage

export interface EncryptedPayload {
  nonce: string
  ciphertext: string
}

export interface SecureEventEnvelope extends EncryptedPayload {
  v: typeof LOCAL_SYNC_PROTOCOL_VERSION
  kind: "event"
  sessionId: string
  senderDeviceId: string
  sequence: number
  sentAt: number
}

export interface SyncEvent<T = unknown> {
  type: string
  payload: T
  eventId: string
}

export interface DeviceIdentity {
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicJwk: JsonWebKey
  fingerprint: string
}

export interface PairingSession {
  sessionId: string
  familyId: string
  localDeviceId: string
  remoteDeviceId: string
  key: CryptoKey
}

export interface NativeMessageEvent {
  mode: "host" | "client"
  sessionId: string
  remoteDeviceId: string
  /** Optionaler Hint vom Native-Plugin; Demux bleibt in TypeScript maßgeblich. */
  channel?: NearbyChannel
  data: string
}

export interface NativePeerEvent {
  peerId: string
  serviceName: string
  host: string
  port: number
  deviceId: string
  role: string
  serviceType: string
}

export interface NativeConnectionEvent {
  state:
    | "hosting"
    | "connecting"
    | "connected"
    | "clientConnected"
    | "clientDisconnected"
    | "disconnected"
    | "suspended"
  sessionId?: string
  reason?: string
}

export interface NativeLocalNetworkStatus {
  foreground: boolean
  foregroundOnly: boolean
  /** true wenn NearbySyncForegroundService läuft. */
  foregroundService?: boolean
  backgroundService: boolean
  lanAvailable: boolean
  transport: string | null
  discovering: boolean
  peerCount: number
  hosting: boolean
  hostClientCount: number
  connected: boolean
  sessionId: string | null
  nearbyWifiPermission: "granted" | "denied" | "prompt" | "notRequired"
}

export interface NativeLocalNetworkError {
  code: string
  message: string
}

export interface LocalRawMessageEvent {
  connectionId: string
  remoteDeviceId?: string
  /** Immer gesetzt; fehlendes Wire-Feld → "sync". */
  channel: NearbyChannel
  data: string
}

export interface LocalRawMessageOptions {
  /** Nur Events dieses Kanals an den Listener liefern. */
  channel?: NearbyChannel
}

export interface LocalRawConnectionEvent {
  connectionId: string
  state: "connected" | "disconnected" | "failed"
  error?: string
}

/**
 * Vertrag des nativen Capacitor-Plugins. Binärdaten werden als base64url/JSON
 * transportiert; Kryptografie und Protokoll bleiben in TypeScript.
 */
export interface LocalNetworkSyncPlugin {
  discoverPeers(options?: { timeoutMs?: number }): Promise<{
    started: boolean
    serviceType: string
    timeoutMs: number
  }>
  startHost(options: {
    pairingToken: string
    deviceId?: string
    serviceName?: string
    maxClients?: number
    singleUseToken?: boolean
  }): Promise<NativePeerEvent & {
    hosting: boolean
    transport: string
    singleUseToken: boolean
    foregroundOnly: boolean
  }>
  connect(options: {
    peerId?: string
    host?: string
    port?: number
    pairingToken: string
    deviceId?: string
  }): Promise<{ connecting: boolean; foregroundOnly: boolean }>
  send(options: {
    data: string
    /** Optional; Framing für game/exchange erfolgt in TypeScript. */
    channel?: NearbyChannel
  }): Promise<{ sent: number; mode: "client" | "host"; channel?: NearbyChannel }>
  disconnect(options?: { scope?: "client" | "host" | "discovery" | "all" }): Promise<NativeLocalNetworkStatus>
  status(): Promise<NativeLocalNetworkStatus>
  startForegroundSync(options?: {
    title?: string
    text?: string
  }): Promise<NativeLocalNetworkStatus & { started?: boolean }>
  stopForegroundSync(): Promise<NativeLocalNetworkStatus & { stopped?: boolean }>
  addListener(eventName: "message", listener: (event: NativeMessageEvent) => void): Promise<PluginListenerHandle>
  addListener(eventName: "peerFound", listener: (event: NativePeerEvent) => void): Promise<PluginListenerHandle>
  addListener(eventName: "peerLost", listener: (event: NativePeerEvent) => void): Promise<PluginListenerHandle>
  addListener(eventName: "connectionState", listener: (event: NativeConnectionEvent) => void): Promise<PluginListenerHandle>
  addListener(eventName: "statusChanged", listener: (event: NativeLocalNetworkStatus) => void): Promise<PluginListenerHandle>
  addListener(eventName: "localNetworkError", listener: (event: NativeLocalNetworkError) => void): Promise<PluginListenerHandle>
}

export interface LocalRawTransport {
  readonly available: boolean
  /** Aktuelle Raw-Connection-ID (z. B. nach Dual-Radio-Bulk), sonst null. */
  getConnectionId?(): string | null
  startHost(options: { deviceId: string; pairingToken: string }): Promise<LocalHostInfo>
  stopHost(): Promise<void>
  discover(
    onPeer: (peer: DiscoveredPeer) => void,
    onPeerLost?: (peer: DiscoveredPeer) => void,
  ): Promise<() => Promise<void>>
  connect(peer: Pick<DiscoveredPeer, "host" | "port" | "peerId">, pairingToken: string, deviceId: string): Promise<string>
  disconnect(connectionId: string): Promise<void>
  send(connectionId: string, data: string, channel?: NearbyChannel): Promise<void>
  onMessage(
    listener: (event: LocalRawMessageEvent) => void,
    options?: LocalRawMessageOptions,
  ): () => void
  onConnection(listener: (event: LocalRawConnectionEvent) => void): () => void
  dispose(): Promise<void>
}

export interface GenericSyncTransport {
  readonly kind: "local-network"
  getState(): LocalSyncState
  getRemoteDeviceId?(): string | null
  send<T>(type: string, payload: T): Promise<void>
  subscribe(listener: (event: SyncEvent) => void): () => void
  subscribeState(listener: (state: LocalSyncState) => void): () => void
  disconnect(): Promise<void>
}
