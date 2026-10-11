import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core"
import { decodeNearbyFrame, encodeNearbyFrame } from "@/lib/nearby/channels"
import {
  NEARBY_DISCOVERY_TIMEOUT_MS,
  NEARBY_WLAN_CONNECT_TIMEOUT_MS,
} from "@/lib/nearby/transport-contract"
import type {
  DiscoveredPeer,
  LocalHostInfo,
  LocalNetworkSyncPlugin,
  LocalRawConnectionEvent,
  LocalRawMessageEvent,
  LocalRawMessageOptions,
  LocalRawTransport,
  NativeConnectionEvent,
  NativeMessageEvent,
  NearbyChannel,
} from "./types"

const PLUGIN_NAME = "LocalNetworkSync"
const NativeLocalNetworkSync = registerPlugin<LocalNetworkSyncPlugin>(PLUGIN_NAME)

type MessageListener = (event: LocalRawMessageEvent) => void
type ConnectionListener = (event: LocalRawConnectionEvent) => void

function toDiscoveredPeer(peer: {
  peerId: string
  serviceName: string
  host: string
  port: number
  deviceId: string
  role: string
}): DiscoveredPeer {
  return {
    serviceId: peer.peerId,
    peerId: peer.peerId,
    deviceId: peer.deviceId,
    role: peer.role,
    name: peer.serviceName,
    host: peer.host,
    port: peer.port,
    protocolVersion: 1,
  }
}

class BrowserNoopLocalTransport implements LocalRawTransport {
  readonly available = false

  getConnectionId(): string | null {
    return null
  }

  async startHost(): Promise<LocalHostInfo> {
    throw new Error("Lokaler WLAN-Transport benötigt das native LocalNetworkSyncPlugin")
  }

  async stopHost(): Promise<void> {}

  async discover(): Promise<() => Promise<void>> {
    return async () => {}
  }

  async connect(): Promise<string> {
    throw new Error("Lokaler WLAN-Transport ist im Browser nicht verfügbar")
  }

  async disconnect(): Promise<void> {}

  async send(_connectionId: string, _data: string, _channel?: NearbyChannel): Promise<void> {
    throw new Error("Keine lokale WLAN-Verbindung")
  }

  onMessage(_listener: MessageListener, _options?: LocalRawMessageOptions): () => void {
    return () => {}
  }

  onConnection(): () => void {
    return () => {}
  }

  async dispose(): Promise<void> {}
}

export class CapacitorLocalRawTransport implements LocalRawTransport {
  readonly available = true
  private readonly messageListeners = new Map<MessageListener, { channel?: NearbyChannel }>()
  private readonly connectionListeners = new Set<ConnectionListener>()
  private nativeHandles: PluginListenerHandle[] = []
  private setupPromise: Promise<void> | null = null
  private currentConnectionId = ""
  private pendingConnect:
    | { resolve: (sessionId: string) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }
    | null = null

  constructor(private readonly plugin: LocalNetworkSyncPlugin = NativeLocalNetworkSync) {}

  getConnectionId(): string | null {
    return this.currentConnectionId || null
  }

  private ensureListeners(): Promise<void> {
    if (this.setupPromise) return this.setupPromise
    this.setupPromise = (async () => {
      const [message, connection, nativeError] = await Promise.all([
        this.plugin.addListener("message", (event: NativeMessageEvent) => {
          // Wire-Demux in TS ist maßgeblich (Native darf channel nur als Hint setzen).
          const frame = decodeNearbyFrame(event.data)
          const delivered: LocalRawMessageEvent = {
            connectionId: event.sessionId,
            remoteDeviceId: event.remoteDeviceId,
            channel: frame.channel,
            data: frame.data,
          }
          for (const [listener, filter] of this.messageListeners) {
            if (filter.channel && filter.channel !== delivered.channel) continue
            listener(delivered)
          }
        }),
        this.plugin.addListener("connectionState", (event: NativeConnectionEvent) => {
          const sessionId = event.sessionId ?? ""
          if ((event.state === "connected" || event.state === "clientConnected") && sessionId) {
            this.currentConnectionId = sessionId
            if (event.state === "connected" && this.pendingConnect) {
              clearTimeout(this.pendingConnect.timeout)
              this.pendingConnect.resolve(sessionId)
              this.pendingConnect = null
            }
            for (const listener of this.connectionListeners) {
              listener({ connectionId: sessionId, state: "connected" })
            }
          } else if (
            event.state === "disconnected" ||
            event.state === "clientDisconnected" ||
            event.state === "suspended"
          ) {
            if (this.pendingConnect) {
              clearTimeout(this.pendingConnect.timeout)
              this.pendingConnect.reject(new Error(event.reason ?? "Native LAN-Verbindung getrennt"))
              this.pendingConnect = null
            }
            for (const listener of this.connectionListeners) {
              listener({
                connectionId: sessionId || this.currentConnectionId,
                state: event.state === "suspended" ? "failed" : "disconnected",
                error: event.reason,
              })
            }
            this.currentConnectionId = ""
          }
        }),
        this.plugin.addListener("localNetworkError", (event) => {
          const message = `${event.code}: ${event.message}`
          if (this.pendingConnect) {
            clearTimeout(this.pendingConnect.timeout)
            this.pendingConnect.reject(new Error(message))
            this.pendingConnect = null
          }
          for (const listener of this.connectionListeners) {
            listener({
              connectionId: this.currentConnectionId,
              state: "failed",
              error: message,
            })
          }
        }),
      ])
      this.nativeHandles.push(message, connection, nativeError)
    })()
    return this.setupPromise
  }

  async startHost(options: { deviceId: string; pairingToken: string }): Promise<LocalHostInfo> {
    await this.ensureListeners()
    const result = await this.plugin.startHost({
      pairingToken: options.pairingToken,
      deviceId: options.deviceId,
      serviceName: `FamiDo-${options.deviceId.slice(-6)}`,
      maxClients: 1,
      // Die app-seitige Pairing-Anfrage bleibt einmalig. Der native HMAC-Kanal
      // darf denselben hochentropischen Token nur für verschlüsselte Session-Resumes verwenden.
      singleUseToken: false,
    })
    return {
      serviceId: result.peerId,
      host: result.host,
      port: result.port,
    }
  }

  async stopHost(): Promise<void> {
    await this.plugin.disconnect({ scope: "host" })
  }

  async discover(
    onPeer: (peer: DiscoveredPeer) => void,
    onPeerLost?: (peer: DiscoveredPeer) => void,
  ): Promise<() => Promise<void>> {
    await this.ensureListeners()
    const [foundHandle, lostHandle] = await Promise.all([
      this.plugin.addListener("peerFound", (peer) => onPeer(toDiscoveredPeer(peer))),
      this.plugin.addListener("peerLost", (peer) => onPeerLost?.(toDiscoveredPeer(peer))),
    ])
    this.nativeHandles.push(foundHandle, lostHandle)
    try {
      await this.plugin.discoverPeers({ timeoutMs: NEARBY_DISCOVERY_TIMEOUT_MS })
    } catch (error) {
      await Promise.allSettled([foundHandle.remove(), lostHandle.remove()])
      this.nativeHandles = this.nativeHandles.filter(
        (item) => item !== foundHandle && item !== lostHandle,
      )
      throw error
    }
    return async () => {
      await this.plugin.disconnect({ scope: "discovery" })
      await Promise.allSettled([foundHandle.remove(), lostHandle.remove()])
      this.nativeHandles = this.nativeHandles.filter(
        (item) => item !== foundHandle && item !== lostHandle,
      )
    }
  }

  async connect(
    peer: Pick<DiscoveredPeer, "host" | "port" | "peerId">,
    pairingToken: string,
    deviceId: string,
  ): Promise<string> {
    await this.ensureListeners()
    if (this.pendingConnect) throw new Error("Eine native LAN-Verbindung wird bereits aufgebaut")
    let connectTimeout: ReturnType<typeof setTimeout> | undefined
    const connected = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingConnect?.timeout === timeout) this.pendingConnect = null
        reject(new Error("Native LAN-Verbindung hat das Zeitlimit überschritten"))
      }, NEARBY_WLAN_CONNECT_TIMEOUT_MS)
      connectTimeout = timeout
      this.pendingConnect = { resolve, reject, timeout }
    })
    try {
      await this.plugin.connect({
        peerId: peer.peerId,
        host: peer.peerId ? undefined : peer.host,
        port: peer.peerId ? undefined : peer.port,
        pairingToken,
        deviceId,
      })
      return await connected
    } catch (error) {
      if (connectTimeout) clearTimeout(connectTimeout)
      this.pendingConnect = null
      throw error
    }
  }

  async disconnect(_connectionId: string): Promise<void> {
    await this.plugin.disconnect({ scope: "client" })
  }

  async send(_connectionId: string, data: string, channel: NearbyChannel = "sync"): Promise<void> {
    const wire = encodeNearbyFrame(channel, data)
    const result = await this.plugin.send({ data: wire, channel })
    if (result.sent < 1) throw new Error("Native LAN-Nachricht erreichte kein verbundenes Gerät")
  }

  onMessage(listener: MessageListener, options?: LocalRawMessageOptions): () => void {
    this.messageListeners.set(listener, { channel: options?.channel })
    void this.ensureListeners()
    return () => this.messageListeners.delete(listener)
  }

  onConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener)
    void this.ensureListeners()
    return () => this.connectionListeners.delete(listener)
  }

  async dispose(): Promise<void> {
    if (this.pendingConnect) {
      clearTimeout(this.pendingConnect.timeout)
      this.pendingConnect.reject(new Error("LAN-Transport wurde beendet"))
      this.pendingConnect = null
    }
    const handles = this.nativeHandles.splice(0)
    await Promise.allSettled(handles.map((handle) => handle.remove()))
    this.messageListeners.clear()
    this.connectionListeners.clear()
    this.setupPromise = null
  }
}

let sharedRawTransport: LocalRawTransport | null = null

/** Ein Raw-Transport pro App-Prozess — Sync und Nearby teilen die Socket-Verbindung. */
export function getSharedLocalRawTransport(): LocalRawTransport {
  if (!sharedRawTransport) {
    sharedRawTransport = createLocalRawTransport()
  }
  return sharedRawTransport
}

export function createLocalRawTransport(): LocalRawTransport {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable(PLUGIN_NAME)) {
    return new BrowserNoopLocalTransport()
  }
  return new CapacitorLocalRawTransport()
}

export async function isLocalNetworkSyncAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable(PLUGIN_NAME)) return false
  try {
    const status = await NativeLocalNetworkSync.status()
    const active = status.foreground || Boolean(status.foregroundService)
    return active && status.lanAvailable
  } catch {
    return false
  }
}
