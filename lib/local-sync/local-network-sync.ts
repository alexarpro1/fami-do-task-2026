import {
  createChallengeProof,
  decryptBytes,
  decryptEventEnvelope,
  derivePairingBootstrapKey,
  deriveSessionKey,
  encryptBytes,
  encryptEventEnvelope,
  fingerprintPublicJwk,
  loadOrCreateDeviceIdentity,
  verifyChallengeProof,
} from "./crypto"
import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  MAX_WIRE_BYTES,
  OneTimeTokenRegistry,
  ReplayProtector,
  assertWireSize,
  decodeQrPayload,
  encodeQrPayload,
  randomBase64Url,
  utf8Decoder,
  utf8Encoder,
  validateEncryptedPayload,
} from "./protocol"
import { INITIAL_LOCAL_SYNC_STATE, reconnectDelayMs, reduceLocalSyncState } from "./state-machine"
import { createLocalRawTransport } from "./transport"
import type {
  DeviceIdentity,
  DiscoveredPeer,
  GenericSyncTransport,
  LocalRawTransport,
  LocalSyncState,
  LocalSyncStateEvent,
  PairAcceptedMessage,
  PairChallengeMessage,
  PairInitMessage,
  PairInitSecret,
  PairResponseMessage,
  PairingInviteMessage,
  PairingInviteRequestMessage,
  PairingSession,
  QrPairingPayload,
  SecureEventEnvelope,
  SyncEvent,
} from "./types"
import { LOCAL_SYNC_PROTOCOL_VERSION } from "./types"

interface ParentPendingPair {
  connectionId: string
  session: PairingSession
  challenge: string
}

interface ChildPendingPair {
  qr: QrPairingPayload
  childNonce: string
  challenge?: string
}

export interface LocalNetworkSyncOptions {
  familyId: string
  deviceId: string
  transport?: LocalRawTransport
  identityLoader?: () => Promise<DeviceIdentity>
  now?: () => number
}

type StateListener = (state: LocalSyncState) => void
type EventListener = (event: SyncEvent) => void

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Lokale Sync-Nachricht muss ein Objekt sein")
  }
  return value as Record<string, unknown>
}

function requiredString(record: Record<string, unknown>, key: string, max = 256): string {
  const value = record[key]
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    throw new Error(`Ungültiges Feld ${key}`)
  }
  return value
}

function parsePairInit(record: Record<string, unknown>): PairInitMessage {
  const childPublicKey = asRecord(record.childPublicKey) as JsonWebKey
  if (record.v !== LOCAL_SYNC_PROTOCOL_VERSION || childPublicKey.kty !== "EC" || childPublicKey.crv !== "P-256") {
    throw new Error("Ungültige Pairing-Anfrage")
  }
  return {
    kind: "pair-init",
    v: LOCAL_SYNC_PROTOCOL_VERSION,
    childPublicKey,
    sealed: validateEncryptedPayload(record.sealed),
  }
}

function parsePairInitSecret(value: unknown): PairInitSecret {
  const record = asRecord(value)
  return {
    familyId: requiredString(record, "familyId", 128),
    childDeviceId: requiredString(record, "childDeviceId", 128),
    token: requiredString(record, "token", 128),
    childNonce: requiredString(record, "childNonce", 128),
  }
}

function parsePairChallenge(record: Record<string, unknown>): PairChallengeMessage {
  const parentPublicKey = asRecord(record.parentPublicKey) as JsonWebKey
  if (record.v !== LOCAL_SYNC_PROTOCOL_VERSION || parentPublicKey.kty !== "EC" || parentPublicKey.crv !== "P-256") {
    throw new Error("Ungültige Pairing-Challenge")
  }
  return {
    kind: "pair-challenge",
    v: LOCAL_SYNC_PROTOCOL_VERSION,
    sessionId: requiredString(record, "sessionId", 128),
    parentDeviceId: requiredString(record, "parentDeviceId", 128),
    parentPublicKey,
    parentNonce: requiredString(record, "parentNonce", 128),
    challenge: requiredString(record, "challenge", 128),
  }
}

function parsePairResponse(record: Record<string, unknown>): PairResponseMessage {
  if (record.v !== LOCAL_SYNC_PROTOCOL_VERSION) throw new Error("Ungültige Pairing-Antwort")
  return {
    kind: "pair-response",
    v: LOCAL_SYNC_PROTOCOL_VERSION,
    sessionId: requiredString(record, "sessionId", 128),
    proof: validateEncryptedPayload(record.proof),
  }
}

function parsePairAccepted(record: Record<string, unknown>): PairAcceptedMessage {
  if (record.v !== LOCAL_SYNC_PROTOCOL_VERSION) throw new Error("Ungültige Pairing-Bestätigung")
  return {
    kind: "pair-accepted",
    v: LOCAL_SYNC_PROTOCOL_VERSION,
    sessionId: requiredString(record, "sessionId", 128),
    proof: validateEncryptedPayload(record.proof),
  }
}

function parseSecureEnvelope(record: Record<string, unknown>): SecureEventEnvelope {
  if (record.v !== LOCAL_SYNC_PROTOCOL_VERSION || record.kind !== "event") {
    throw new Error("Ungültiger sicherer Envelope")
  }
  if (!Number.isSafeInteger(record.sequence) || !Number.isSafeInteger(record.sentAt)) {
    throw new Error("Ungültige Envelope-Sequenz")
  }
  const encrypted = validateEncryptedPayload(record)
  return {
    v: LOCAL_SYNC_PROTOCOL_VERSION,
    kind: "event",
    sessionId: requiredString(record, "sessionId", 128),
    senderDeviceId: requiredString(record, "senderDeviceId", 128),
    sequence: record.sequence as number,
    sentAt: record.sentAt as number,
    ...encrypted,
  }
}

export class LocalNetworkSync implements GenericSyncTransport {
  readonly kind = "local-network" as const
  private readonly familyId: string
  private readonly deviceId: string
  private readonly transport: LocalRawTransport
  private readonly identityLoader: () => Promise<DeviceIdentity>
  private readonly now: () => number
  private readonly tokens = new OneTimeTokenRegistry()
  private readonly stateListeners = new Set<StateListener>()
  private readonly eventListeners = new Set<EventListener>()
  private readonly unsubscribeTransport: Array<() => void> = []
  private state = { ...INITIAL_LOCAL_SYNC_STATE }
  private identity: DeviceIdentity | null = null
  private session: PairingSession | null = null
  private replay = new ReplayProtector()
  private parentPending: ParentPendingPair | null = null
  private childPending: ChildPendingPair | null = null
  private outboundSequence = 0
  private nativePairingToken: string | null = null
  private lastSeenAt = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private stopDiscovery: (() => Promise<void>) | null = null
  private intentionallyStopped = false
  /** Aktiver Parent-QR (kurzlebig) für Dual-Radio pairing-invite. */
  private activePairing: { payload: QrPairingPayload; encoded: string } | null = null
  /** Child wartet auf pairing-invite nach Dual-Radio-Bulk. */
  private awaitingPairingInvite = false
  private pendingDualRadioPeer: DiscoveredPeer | undefined

  constructor(options: LocalNetworkSyncOptions) {
    this.familyId = options.familyId
    this.deviceId = options.deviceId
    this.transport = options.transport ?? createLocalRawTransport()
    this.identityLoader = options.identityLoader ?? loadOrCreateDeviceIdentity
    this.now = options.now ?? Date.now
  }

  get available(): boolean {
    return this.transport.available
  }

  getState(): LocalSyncState {
    return this.state
  }

  getRemoteDeviceId(): string | null {
    return this.session?.remoteDeviceId ?? null
  }

  subscribe(listener: EventListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    listener(this.state)
    return () => this.stateListeners.delete(listener)
  }

  private transition(event: LocalSyncStateEvent): void {
    this.state = reduceLocalSyncState(this.state, event)
    for (const listener of this.stateListeners) listener(this.state)
  }

  private async getIdentity(): Promise<DeviceIdentity> {
    this.identity ??= await this.identityLoader()
    return this.identity
  }

  private ensureTransportSubscriptions(): void {
    if (this.unsubscribeTransport.length > 0) return
    this.unsubscribeTransport.push(
      // Nur Familien-Sync-Kanal; game/exchange laufen außerhalb der Sync-v3-Queue.
      this.transport.onMessage(
        (event) => void this.handleWireMessage(event.connectionId, event.data),
        { channel: "sync" },
      ),
      this.transport.onConnection((event) => void this.handleConnectionEvent(event)),
    )
  }

  async startParent(
    port?: number,
  ): Promise<{ payload: QrPairingPayload; encoded: string; serviceId: string }> {
    this.intentionallyStopped = false
    this.ensureTransportSubscriptions()
    await this.stopPeerDiscovery()
    if (this.state.phase !== "hosting") {
      if (!["idle", "error", "stopped"].includes(this.state.phase)) {
        throw new Error("Aktive LAN-Sitzung zuerst stoppen")
      }
      this.transition({ type: "HOST", role: "parent" })
    }
    try {
      const identity = await this.getIdentity()
      const issued = this.tokens.issue(this.now())
      // Digest/QR/Host teilen denselben kurzlebigen Bearer (dpt1, an family+device+expiry gebunden)
      const { mintDigestPairingToken } = await import("@/lib/nearby/presence-digest")
      const hostToken = await mintDigestPairingToken({
        rawToken: issued.token,
        familyId: this.familyId,
        deviceId: this.deviceId,
        expiresAt: issued.expiresAt,
        now: this.now(),
      })
      this.tokens.discard(issued.token)
      this.tokens.track(hostToken, issued.expiresAt)
      this.nativePairingToken = hostToken
      const host = await this.transport.startHost({
        deviceId: this.deviceId,
        pairingToken: hostToken,
      })
      const payload: QrPairingPayload = {
        v: LOCAL_SYNC_PROTOCOL_VERSION,
        familyId: this.familyId,
        parentDeviceId: this.deviceId,
        parentFingerprint: identity.fingerprint,
        parentPublicKey: identity.publicJwk,
        host: host.host,
        port: host.port,
        token: hostToken,
        expiresAt: issued.expiresAt,
      }
      const encoded = encodeQrPayload(payload)
      this.activePairing = { payload, encoded }
      return {
        payload,
        encoded,
        serviceId: host.serviceId,
      }
    } catch (error) {
      this.activePairing = null
      this.transition({ type: "FAIL", error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /** Kurzlebiger Parent-QR für Tests / Dual-Radio-Announce. */
  getActivePairingEncoded(): string | null {
    return this.activePairing?.encoded ?? null
  }

  async discoverPeers(
    onPeer: (peer: DiscoveredPeer) => void,
    onPeerLost?: (peer: DiscoveredPeer) => void,
  ): Promise<void> {
    this.intentionallyStopped = false
    this.ensureTransportSubscriptions()
    await this.stopPeerDiscovery()
    if (["idle", "error", "stopped"].includes(this.state.phase)) {
      this.transition({ type: "DISCOVER", role: "child" })
    }
    this.stopDiscovery = await this.transport.discover(
      (peer) => {
        if (
          peer.protocolVersion === LOCAL_SYNC_PROTOCOL_VERSION
          && peer.deviceId !== this.deviceId
        ) {
          onPeer(peer)
        }
      },
      (peer) => {
        if (peer.deviceId !== this.deviceId) onPeerLost?.(peer)
      },
    )
  }

  async stopPeerDiscovery(): Promise<void> {
    const stop = this.stopDiscovery
    this.stopDiscovery = null
    if (stop) await stop()
    if (this.state.phase === "discovering") {
      this.transition({ type: "RESET" })
    }
  }

  async connectChild(
    encodedQrPayload: string,
    discoveredPeer?: DiscoveredPeer,
  ): Promise<void> {
    const qr = decodeQrPayload(encodedQrPayload, this.now())
    await this.beginChildPairing(qr, discoveredPeer)
  }

  /**
   * Nach Dual-Radio-Bulk: bestehende WLAN-Raw-Connection nutzen, pairing-invite
   * vom Parent anfordern und ECDH (pair-init) starten — ohne QR-Scan.
   * QR bleibt Fallback über connectChild.
   */
  async connectChildFromDualRadio(discoveredPeer?: DiscoveredPeer): Promise<void> {
    this.intentionallyStopped = false
    this.ensureTransportSubscriptions()
    this.awaitingPairingInvite = true
    this.pendingDualRadioPeer = discoveredPeer
    const connectionId =
      this.state.connectionId ||
      this.transport.getConnectionId?.() ||
      null
    if (!connectionId) {
      throw new Error(
        "Keine WLAN-Bulk-Verbindung für Auto-Pairing — Dual-Radio-Upgrade zuerst oder QR scannen",
      )
    }
    if (this.state.phase === "idle" || this.state.phase === "error" || this.state.phase === "stopped") {
      this.transition({ type: "DISCOVER", role: "child" })
    }
    if (this.state.phase === "discovering" && discoveredPeer) {
      this.transition({ type: "CONNECT", peer: discoveredPeer })
    } else if (this.state.phase === "discovering") {
      this.transition({
        type: "CONNECT",
        peer: {
          serviceId: discoveredPeer?.serviceId ?? "dual-radio-parent",
          peerId: discoveredPeer?.peerId,
          deviceId: discoveredPeer?.deviceId ?? "parent",
          role: "parent",
          name: discoveredPeer?.name ?? "FamiDo Parent",
          host: discoveredPeer?.host ?? "0.0.0.0",
          port: discoveredPeer?.port ?? 1,
          protocolVersion: LOCAL_SYNC_PROTOCOL_VERSION,
        },
      })
    }
    if (this.state.phase === "connecting") {
      this.transition({ type: "TRANSPORT_CONNECTED", connectionId })
    }
    await this.sendWire(connectionId, {
      kind: "pairing-invite-request",
      v: LOCAL_SYNC_PROTOCOL_VERSION,
    } satisfies PairingInviteRequestMessage)
  }

  private async beginChildPairing(
    qr: QrPairingPayload,
    discoveredPeer?: DiscoveredPeer,
    existingConnectionId?: string | null,
  ): Promise<void> {
    this.intentionallyStopped = false
    this.ensureTransportSubscriptions()
    this.awaitingPairingInvite = false
    if (discoveredPeer?.deviceId && discoveredPeer.deviceId !== qr.parentDeviceId) {
      throw new Error("Der QR-Code gehört nicht zum ausgewählten FamiDo-Gerät")
    }
    if (qr.familyId !== this.familyId) {
      throw new Error("Der LAN-QR-Code gehört nicht zur zentral gekoppelten Familie.")
    }
    this.nativePairingToken = qr.token
    const peer: DiscoveredPeer = {
      serviceId: discoveredPeer?.serviceId ?? `qr:${qr.parentDeviceId}`,
      peerId: discoveredPeer?.peerId,
      deviceId: qr.parentDeviceId,
      role: discoveredPeer?.role ?? "parent",
      name: discoveredPeer?.name ?? "FamiDo Parent",
      host: discoveredPeer?.host ?? qr.host,
      port: discoveredPeer?.port ?? qr.port,
      protocolVersion: qr.v,
      fingerprint: qr.parentFingerprint,
    }
    await this.stopPeerDiscovery()
    try {
      const identity = await this.getIdentity()
      const advertisedFingerprint = await fingerprintPublicJwk(qr.parentPublicKey)
      if (advertisedFingerprint !== qr.parentFingerprint) {
        throw new Error("QR-Geräteschlüssel stimmt nicht mit seinem Fingerprint überein")
      }
      const childNonce = randomBase64Url(32)
      this.childPending = { qr, childNonce }
      const bootstrapKey = await derivePairingBootstrapKey(
        identity.privateKey,
        qr.parentPublicKey,
        qr.parentFingerprint,
      )
      const sealed = await encryptBytes(
        bootstrapKey,
        utf8Encoder.encode(
          JSON.stringify({
            familyId: qr.familyId,
            childDeviceId: this.deviceId,
            token: qr.token,
            childNonce,
          } satisfies PairInitSecret),
        ),
        utf8Encoder.encode("famido-pair-init-v1"),
      )

      const reuseId =
        existingConnectionId ||
        this.state.connectionId ||
        this.transport.getConnectionId?.() ||
        null

      // Zustandsmaschine: idle/error/stopped → discovering → connecting → pairing
      if (["idle", "error", "stopped"].includes(this.state.phase)) {
        this.transition({ type: "DISCOVER", role: "child" })
      }
      if (this.state.phase === "discovering" || this.state.phase === "reconnecting") {
        this.transition({ type: "CONNECT", peer })
      } else if (this.state.phase === "pairing" || this.state.phase === "connecting") {
        // Dual-Radio / Resume: Peer aktualisieren ohne illegalen Übergang
        this.state = { ...this.state, peer, error: null }
        for (const listener of this.stateListeners) listener(this.state)
      }

      let connectionId = reuseId
      if (!connectionId) {
        if (this.state.phase !== "connecting" && this.state.phase !== "pairing") {
          throw new Error(`Ungültiger Local-Sync-Zustand für Pairing: ${this.state.phase}`)
        }
        connectionId = await this.transport.connect(peer, qr.token, this.deviceId)
      }
      if (this.state.phase === "connecting") {
        this.transition({ type: "TRANSPORT_CONNECTED", connectionId })
      } else if (this.state.phase === "pairing" && this.state.connectionId !== connectionId) {
        this.state = { ...this.state, connectionId }
        for (const listener of this.stateListeners) listener(this.state)
      }
      await this.sendWire(connectionId, {
        kind: "pair-init",
        v: LOCAL_SYNC_PROTOCOL_VERSION,
        childPublicKey: identity.publicJwk,
        sealed,
      } satisfies PairInitMessage)
    } catch (error) {
      this.transition({ type: "FAIL", error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  private async sendPairingInvite(connectionId: string): Promise<void> {
    if (!this.activePairing || this.state.role !== "parent") return
    try {
      decodeQrPayload(this.activePairing.encoded, this.now())
    } catch {
      this.activePairing = null
      return
    }
    await this.sendWire(connectionId, {
      kind: "pairing-invite",
      v: LOCAL_SYNC_PROTOCOL_VERSION,
      encoded: this.activePairing.encoded,
    } satisfies PairingInviteMessage)
  }

  private async handlePairingInviteRequest(connectionId: string): Promise<void> {
    if (this.state.role !== "parent") return
    await this.sendPairingInvite(connectionId)
  }

  private async handlePairingInvite(message: PairingInviteMessage): Promise<void> {
    if (!this.awaitingPairingInvite) return
    if (this.state.phase === "connected" || this.childPending) return
    const qr = decodeQrPayload(message.encoded, this.now())
    const peer = this.pendingDualRadioPeer
    this.pendingDualRadioPeer = undefined
    await this.beginChildPairing(qr, peer, this.state.connectionId || this.transport.getConnectionId?.())
  }

  async send<T>(type: string, payload: T): Promise<void> {
    if (this.state.phase !== "connected") throw new Error("Lokaler Sync ist nicht verbunden")
    await this.sendSecureInternal({
      type,
      payload,
      eventId: randomBase64Url(18),
    })
  }

  private async sendSecureInternal(event: SyncEvent): Promise<void> {
    if (!this.session || !this.state.connectionId) throw new Error("Keine sichere lokale Sitzung")
    const envelope = await encryptEventEnvelope(
      this.session.key,
      this.session.sessionId,
      this.deviceId,
      ++this.outboundSequence,
      event,
      this.now(),
    )
    await this.sendWire(this.state.connectionId, envelope)
  }

  private async sendWire(connectionId: string, message: unknown): Promise<void> {
    const data = JSON.stringify(message)
    assertWireSize(data)
    await this.transport.send(connectionId, data, "sync")
  }

  private async handleWireMessage(connectionId: string, data: string): Promise<void> {
    try {
      assertWireSize(data, MAX_WIRE_BYTES)
      const record = asRecord(JSON.parse(data) as unknown)
      const kind = requiredString(record, "kind", 32)
      if (kind === "pair-init") await this.handlePairInit(connectionId, parsePairInit(record))
      else if (kind === "pair-challenge") await this.handlePairChallenge(connectionId, parsePairChallenge(record))
      else if (kind === "pair-response") await this.handlePairResponse(connectionId, parsePairResponse(record))
      else if (kind === "pair-accepted") await this.handlePairAccepted(parsePairAccepted(record))
      else if (kind === "pairing-invite") {
        await this.handlePairingInvite({
          kind: "pairing-invite",
          v: LOCAL_SYNC_PROTOCOL_VERSION,
          encoded: requiredString(record, "encoded", 4096),
        })
      } else if (kind === "pairing-invite-request") {
        await this.handlePairingInviteRequest(connectionId)
      } else if (kind === "event") await this.handleSecureEnvelope(parseSecureEnvelope(record))
      else throw new Error("Unbekannter Nachrichtentyp")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn("[LocalNetworkSync] Nachricht abgelehnt:", message)
    }
  }

  private async handlePairInit(connectionId: string, message: PairInitMessage): Promise<void> {
    if (this.state.role !== "parent") throw new Error("Pairing nicht erlaubt")
    const identity = await this.getIdentity()
    const bootstrapKey = await derivePairingBootstrapKey(
      identity.privateKey,
      message.childPublicKey,
      identity.fingerprint,
    )
    const plaintext = await decryptBytes(
      bootstrapKey,
      message.sealed,
      utf8Encoder.encode("famido-pair-init-v1"),
    )
    const secret = parsePairInitSecret(JSON.parse(utf8Decoder.decode(plaintext)) as unknown)
    if (secret.familyId !== this.familyId) throw new Error("Pairing nicht erlaubt")
    this.tokens.consume(secret.token, this.now())
    if (this.state.phase === "hosting") {
      this.transition({ type: "TRANSPORT_CONNECTED", connectionId })
    }
    const sessionId = randomBase64Url(24)
    const parentNonce = randomBase64Url(32)
    const challenge = randomBase64Url(32)
    const key = await deriveSessionKey(identity.privateKey, message.childPublicKey, {
      familyId: this.familyId,
      token: secret.token,
      sessionId,
      childNonce: secret.childNonce,
      parentNonce,
    })
    this.parentPending = {
      connectionId,
      challenge,
      session: {
        sessionId,
        familyId: this.familyId,
        localDeviceId: this.deviceId,
        remoteDeviceId: secret.childDeviceId,
        key,
      },
    }
    await this.sendWire(connectionId, {
      kind: "pair-challenge",
      v: LOCAL_SYNC_PROTOCOL_VERSION,
      sessionId,
      parentDeviceId: this.deviceId,
      parentPublicKey: identity.publicJwk,
      parentNonce,
      challenge,
    } satisfies PairChallengeMessage)
  }

  private async handlePairChallenge(connectionId: string, message: PairChallengeMessage): Promise<void> {
    if (this.state.role !== "child" || !this.childPending) throw new Error("Unerwartete Pairing-Challenge")
    const { qr, childNonce } = this.childPending
    if (message.parentDeviceId !== qr.parentDeviceId) throw new Error("Falsches Elterngerät")
    const fingerprint = await fingerprintPublicJwk(message.parentPublicKey)
    if (fingerprint !== qr.parentFingerprint) throw new Error("Fingerprint des Elterngeräts stimmt nicht")
    const identity = await this.getIdentity()
    const key = await deriveSessionKey(identity.privateKey, message.parentPublicKey, {
      familyId: qr.familyId,
      token: qr.token,
      sessionId: message.sessionId,
      childNonce,
      parentNonce: message.parentNonce,
    })
    this.session = {
      sessionId: message.sessionId,
      familyId: qr.familyId,
      localDeviceId: this.deviceId,
      remoteDeviceId: message.parentDeviceId,
      key,
    }
    this.childPending.challenge = message.challenge
    const proof = await createChallengeProof(key, message.sessionId, message.challenge, "child-to-parent")
    await this.sendWire(connectionId, {
      kind: "pair-response",
      v: LOCAL_SYNC_PROTOCOL_VERSION,
      sessionId: message.sessionId,
      proof,
    } satisfies PairResponseMessage)
  }

  private async handlePairResponse(connectionId: string, message: PairResponseMessage): Promise<void> {
    const pending = this.parentPending
    if (!pending || pending.connectionId !== connectionId || pending.session.sessionId !== message.sessionId) {
      throw new Error("Unbekannte Pairing-Sitzung")
    }
    await verifyChallengeProof(
      pending.session.key,
      message.sessionId,
      pending.challenge,
      message.proof,
      "child-to-parent",
    )
    const acceptedChallenge = `accepted:${pending.challenge}`
    const proof = await createChallengeProof(
      pending.session.key,
      message.sessionId,
      acceptedChallenge,
      "parent-to-child",
    )
    this.session = pending.session
    this.parentPending = null
    await this.sendWire(connectionId, {
      kind: "pair-accepted",
      v: LOCAL_SYNC_PROTOCOL_VERSION,
      sessionId: message.sessionId,
      proof,
    } satisfies PairAcceptedMessage)
    this.establishConnectedState()
  }

  private async handlePairAccepted(message: PairAcceptedMessage): Promise<void> {
    if (!this.session || !this.childPending?.challenge || message.sessionId !== this.session.sessionId) {
      throw new Error("Unbekannte Pairing-Bestätigung")
    }
    await verifyChallengeProof(
      this.session.key,
      message.sessionId,
      `accepted:${this.childPending.challenge}`,
      message.proof,
      "parent-to-child",
    )
    this.childPending = null
    this.establishConnectedState()
  }

  private establishConnectedState(resetReplay = true): void {
    if (resetReplay) this.replay = new ReplayProtector()
    this.lastSeenAt = this.now()
    this.transition({ type: "PAIRING_SUCCEEDED" })
    this.startHeartbeat()
  }

  private async handleSecureEnvelope(envelope: SecureEventEnvelope): Promise<void> {
    if (!this.session || envelope.sessionId !== this.session.sessionId) throw new Error("Unbekannte sichere Sitzung")
    if (envelope.senderDeviceId !== this.session.remoteDeviceId) throw new Error("Falscher Envelope-Absender")
    const event = await decryptEventEnvelope(this.session.key, envelope)
    // Erst authentifizieren, dann den Replay-Zustand fortschreiben. So kann ein
    // manipuliertes Paket keine hohe Sequenznummer dauerhaft "vergiften".
    this.replay.assertFresh(envelope, this.now())
    this.lastSeenAt = this.now()
    if (event.type === "__heartbeat") return
    if (event.type === "__resume") {
      if (this.state.phase === "pairing") this.establishConnectedState(false)
      await this.sendSecureInternal({ type: "__resume-ack", payload: null, eventId: randomBase64Url(18) })
      return
    }
    if (event.type === "__resume-ack") {
      if (this.state.phase === "pairing") this.establishConnectedState(false)
      return
    }
    for (const listener of this.eventListeners) listener(event)
  }

  private startHeartbeat(): void {
    this.clearHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.now() - this.lastSeenAt > HEARTBEAT_TIMEOUT_MS) {
        void this.handleConnectionLost("Heartbeat-Zeitüberschreitung")
        return
      }
      void this.sendSecureInternal({ type: "__heartbeat", payload: null, eventId: randomBase64Url(18) }).catch((error) => {
        void this.handleConnectionLost(error instanceof Error ? error.message : String(error))
      })
    }, HEARTBEAT_INTERVAL_MS)
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }

  private async handleConnectionEvent(event: {
    connectionId: string
    state: "connected" | "disconnected" | "failed"
    error?: string
  }): Promise<void> {
    if (event.state === "connected") {
      if (["hosting", "connecting", "reconnecting"].includes(this.state.phase)) {
        this.transition({ type: "TRANSPORT_CONNECTED", connectionId: event.connectionId })
      }
      // Parent: nach Dual-Radio-Bulk / Client-Connect kurzlebiges Pairing-Material pushen
      if (this.state.role === "parent" && this.activePairing) {
        void this.sendPairingInvite(event.connectionId).catch((error) => {
          console.warn("[LocalNetworkSync] pairing-invite fehlgeschlagen", error)
        })
      }
      if (this.state.role === "child" && this.session) {
        await this.sendSecureInternal({ type: "__resume", payload: null, eventId: randomBase64Url(18) })
      }
      return
    }
    if (
      event.state === "failed" &&
      !event.connectionId &&
      ["discovering", "hosting", "connecting", "pairing", "reconnecting"].includes(this.state.phase)
    ) {
      this.transition({ type: "FAIL", error: event.error ?? "Lokaler WLAN-Transport fehlgeschlagen" })
      return
    }
    if (this.state.connectionId === event.connectionId) {
      await this.handleConnectionLost(event.error ?? "Verbindung getrennt")
    }
  }

  private async handleConnectionLost(reason: string): Promise<void> {
    this.clearHeartbeat()
    if (this.intentionallyStopped || !["pairing", "connected", "connecting"].includes(this.state.phase)) return
    this.transition({ type: "CONNECTION_LOST", reason })
    if (this.state.phase === "reconnecting") this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (!this.state.peer || this.intentionallyStopped) return
    const attempt = this.state.reconnectAttempt + 1
    this.transition({ type: "RETRY", attempt })
    const delay = reconnectDelayMs(attempt)
    this.reconnectTimer = setTimeout(async () => {
      if (!this.state.peer || this.intentionallyStopped) return
      try {
        if (!this.nativePairingToken) throw new Error("Pairing-Token für Reconnect fehlt")
        const connectionId = await this.transport.connect(
          this.state.peer,
          this.nativePairingToken,
          this.deviceId,
        )
        if (this.state.phase === "reconnecting") {
          this.transition({ type: "TRANSPORT_CONNECTED", connectionId })
          if (!this.session) throw new Error("Sichere Sitzung kann nicht fortgesetzt werden")
          await this.sendSecureInternal({ type: "__resume", payload: null, eventId: randomBase64Url(18) })
        }
      } catch (error) {
        if (this.state.phase === "reconnecting") this.scheduleReconnect()
        else console.warn("[LocalNetworkSync] Reconnect fehlgeschlagen", error)
      }
    }, delay)
  }

  async disconnect(): Promise<void> {
    this.intentionallyStopped = true
    this.clearHeartbeat()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    if (this.stopDiscovery) await this.stopDiscovery()
    this.stopDiscovery = null
    if (this.state.connectionId) await this.transport.disconnect(this.state.connectionId)
    if (this.state.role === "parent") await this.transport.stopHost()
    this.session = null
    this.nativePairingToken = null
    this.parentPending = null
    this.childPending = null
    this.activePairing = null
    this.awaitingPairingInvite = false
    this.pendingDualRadioPeer = undefined
    this.transition({ type: "STOP" })
  }

  async dispose(): Promise<void> {
    await this.disconnect()
    for (const unsubscribe of this.unsubscribeTransport.splice(0)) unsubscribe()
    await this.transport.dispose()
    this.stateListeners.clear()
    this.eventListeners.clear()
  }
}
