import {
  LOCAL_SYNC_PROTOCOL_VERSION,
  type EncryptedPayload,
  type QrPairingPayload,
  type SecureEventEnvelope,
  type SyncEvent,
} from "./types"

export const LOCAL_SYNC_SERVICE_TYPE = "_famido-sync._tcp"
// Entspricht LocalNetworkWire.MAX_PAYLOAD_BYTES im Android-Plugin.
export const MAX_WIRE_BYTES = 64 * 1024
export const MAX_EVENT_TYPE_LENGTH = 80
export const PAIRING_TOKEN_TTL_MS = 2 * 60 * 1000
export const CLOCK_SKEW_MS = 30 * 1000
export const HEARTBEAT_INTERVAL_MS = 10 * 1000
export const HEARTBEAT_TIMEOUT_MS = 30 * 1000

const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { fatal: true })
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const HOST_PATTERN =
  /^(?=.{1,253}$)(localhost|(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?)$/
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/

export class LocalSyncProtocolError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_SCHEMA"
      | "EXPIRED"
      | "REPLAY"
      | "TOO_LARGE"
      | "CRYPTO"
      | "UNSUPPORTED_VERSION",
  ) {
    super(message)
    this.name = "LocalSyncProtocolError"
  }
}

export function assertWireSize(value: string, maxBytes = MAX_WIRE_BYTES): void {
  if (encoder.encode(value).byteLength > maxBytes) {
    throw new LocalSyncProtocolError("Nachricht überschreitet das Größenlimit", "TOO_LARGE")
  }
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "")
}

export function base64UrlToBytes(value: string, maxBytes = MAX_WIRE_BYTES): Uint8Array {
  if (!value || !BASE64URL_PATTERN.test(value)) {
    throw new LocalSyncProtocolError("Ungültige base64url-Daten", "INVALID_SCHEMA")
  }
  const estimatedBytes = Math.ceil((value.length * 3) / 4)
  if (estimatedBytes > maxBytes) {
    throw new LocalSyncProtocolError("Dekodierte Daten überschreiten das Größenlimit", "TOO_LARGE")
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    throw new LocalSyncProtocolError("Ungültige base64url-Daten", "INVALID_SCHEMA")
  }
}

export function randomBase64Url(byteLength = 32): string {
  if (byteLength < 16 || byteLength > 64) {
    throw new LocalSyncProtocolError("Zufallswert muss 16 bis 64 Byte lang sein", "INVALID_SCHEMA")
  }
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requireString(record: Record<string, unknown>, key: string, maxLength: number): string {
  const value = record[key]
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new LocalSyncProtocolError(`Ungültiges Feld: ${key}`, "INVALID_SCHEMA")
  }
  return value
}

function requireId(record: Record<string, unknown>, key: string): string {
  const value = requireString(record, key, 128)
  if (!ID_PATTERN.test(value)) {
    throw new LocalSyncProtocolError(`Ungültige ID: ${key}`, "INVALID_SCHEMA")
  }
  return value
}

export function encodeQrPayload(payload: QrPairingPayload): string {
  const validated = validateQrPayload(payload)
  return bytesToBase64Url(encoder.encode(JSON.stringify(validated)))
}

export function decodeQrPayload(encoded: string, now = Date.now()): QrPairingPayload {
  if (encoded.length > 4096) {
    throw new LocalSyncProtocolError("QR-Payload ist zu groß", "TOO_LARGE")
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(decoder.decode(base64UrlToBytes(encoded, 3072)))
  } catch (error) {
    if (error instanceof LocalSyncProtocolError) throw error
    throw new LocalSyncProtocolError("QR-Payload ist kein gültiges JSON", "INVALID_SCHEMA")
  }
  const payload = validateQrPayload(parsed)
  if (payload.expiresAt <= now) {
    throw new LocalSyncProtocolError("Pairing-QR ist abgelaufen", "EXPIRED")
  }
  if (payload.expiresAt > now + PAIRING_TOKEN_TTL_MS + CLOCK_SKEW_MS) {
    throw new LocalSyncProtocolError("Pairing-QR hat eine unzulässige Laufzeit", "INVALID_SCHEMA")
  }
  return payload
}

export function validateQrPayload(value: unknown): QrPairingPayload {
  if (!isRecord(value)) {
    throw new LocalSyncProtocolError("QR-Payload muss ein Objekt sein", "INVALID_SCHEMA")
  }
  if (value.v !== LOCAL_SYNC_PROTOCOL_VERSION) {
    throw new LocalSyncProtocolError("Nicht unterstützte Protokollversion", "UNSUPPORTED_VERSION")
  }
  const familyId = requireId(value, "familyId")
  const parentDeviceId = requireId(value, "parentDeviceId")
  const parentFingerprint = requireString(value, "parentFingerprint", 128)
  if (!isRecord(value.parentPublicKey)) {
    throw new LocalSyncProtocolError("Öffentlicher Geräteschlüssel fehlt", "INVALID_SCHEMA")
  }
  const parentPublicKey = value.parentPublicKey as JsonWebKey
  if (
    parentPublicKey.kty !== "EC" ||
    parentPublicKey.crv !== "P-256" ||
    typeof parentPublicKey.x !== "string" ||
    typeof parentPublicKey.y !== "string"
  ) {
    throw new LocalSyncProtocolError("Ungültiger öffentlicher Geräteschlüssel", "INVALID_SCHEMA")
  }
  const host = requireString(value, "host", 253)
  const token = requireString(value, "token", 128)
  if (!HOST_PATTERN.test(host) || !BASE64URL_PATTERN.test(token) || token.length < 32) {
    throw new LocalSyncProtocolError("Ungültiger Host oder Pairing-Token", "INVALID_SCHEMA")
  }
  if (!BASE64URL_PATTERN.test(parentFingerprint) || parentFingerprint.length < 32) {
    throw new LocalSyncProtocolError("Ungültiger Geräte-Fingerprint", "INVALID_SCHEMA")
  }
  if (!Number.isInteger(value.port) || (value.port as number) < 1 || (value.port as number) > 65535) {
    throw new LocalSyncProtocolError("Ungültiger Port", "INVALID_SCHEMA")
  }
  if (!Number.isSafeInteger(value.expiresAt) || (value.expiresAt as number) <= 0) {
    throw new LocalSyncProtocolError("Ungültiger Ablaufzeitpunkt", "INVALID_SCHEMA")
  }
  return {
    v: LOCAL_SYNC_PROTOCOL_VERSION,
    familyId,
    parentDeviceId,
    parentFingerprint,
    parentPublicKey,
    host,
    port: value.port as number,
    token,
    expiresAt: value.expiresAt as number,
  }
}

export class OneTimeTokenRegistry {
  private readonly tokens = new Map<string, { expiresAt: number; consumed: boolean }>()

  issue(now = Date.now(), ttlMs = PAIRING_TOKEN_TTL_MS): { token: string; expiresAt: number } {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0 || ttlMs > PAIRING_TOKEN_TTL_MS) {
      throw new LocalSyncProtocolError("Ungültige Token-Laufzeit", "INVALID_SCHEMA")
    }
    const token = randomBase64Url(32)
    const expiresAt = now + ttlMs
    this.tokens.set(token, { expiresAt, consumed: false })
    return { token, expiresAt }
  }

  /** Registriert einen bereits abgeleiteten Bearer (z. B. dpt1_…) für einmaligen Consume. */
  track(token: string, expiresAt: number): void {
    if (!token || token.length < 16) {
      throw new LocalSyncProtocolError("Ungültiger Pairing-Token", "INVALID_SCHEMA")
    }
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) {
      throw new LocalSyncProtocolError("Ungültiger Ablaufzeitpunkt", "INVALID_SCHEMA")
    }
    this.tokens.set(token, { expiresAt, consumed: false })
  }

  /** Entfernt einen Token-Eintrag ohne Consume (z. B. raw IKM nach Ableitung). */
  discard(token: string): void {
    this.tokens.delete(token)
  }

  consume(token: string, now = Date.now()): void {
    const entry = this.tokens.get(token)
    if (!entry || entry.consumed) {
      throw new LocalSyncProtocolError("Pairing-Token ist unbekannt oder bereits verbraucht", "REPLAY")
    }
    entry.consumed = true
    this.tokens.delete(token)
    if (entry.expiresAt <= now) {
      throw new LocalSyncProtocolError("Pairing-Token ist abgelaufen", "EXPIRED")
    }
  }

  prune(now = Date.now()): void {
    for (const [token, entry] of this.tokens) {
      if (entry.expiresAt <= now || entry.consumed) this.tokens.delete(token)
    }
  }
}

export class ReplayProtector {
  private highestSequence = 0
  private readonly nonces = new Map<string, number>()

  assertFresh(envelope: Pick<SecureEventEnvelope, "sequence" | "sentAt" | "nonce">, now = Date.now()): void {
    if (!Number.isSafeInteger(envelope.sequence) || envelope.sequence <= this.highestSequence) {
      throw new LocalSyncProtocolError("Doppelte oder veraltete Sequenznummer", "REPLAY")
    }
    if (Math.abs(now - envelope.sentAt) > CLOCK_SKEW_MS) {
      throw new LocalSyncProtocolError("Nachrichtenzeit liegt außerhalb des erlaubten Fensters", "REPLAY")
    }
    if (this.nonces.has(envelope.nonce)) {
      throw new LocalSyncProtocolError("Nonce wurde bereits verwendet", "REPLAY")
    }
    this.highestSequence = envelope.sequence
    this.nonces.set(envelope.nonce, envelope.sentAt)
    for (const [nonce, sentAt] of this.nonces) {
      if (now - sentAt > CLOCK_SKEW_MS) this.nonces.delete(nonce)
    }
  }
}

export function validateSyncEvent(value: unknown): SyncEvent {
  if (!isRecord(value)) {
    throw new LocalSyncProtocolError("Sync-Ereignis muss ein Objekt sein", "INVALID_SCHEMA")
  }
  const type = requireString(value, "type", MAX_EVENT_TYPE_LENGTH)
  const eventId = requireId(value, "eventId")
  return { type, eventId, payload: value.payload }
}

export function validateEncryptedPayload(value: unknown): EncryptedPayload {
  if (!isRecord(value)) {
    throw new LocalSyncProtocolError("Verschlüsselter Inhalt fehlt", "INVALID_SCHEMA")
  }
  const nonce = requireString(value, "nonce", 64)
  const ciphertext = requireString(value, "ciphertext", MAX_WIRE_BYTES * 2)
  base64UrlToBytes(nonce, 32)
  base64UrlToBytes(ciphertext)
  return { nonce, ciphertext }
}

export function stableEnvelopeAad(
  envelope: Pick<SecureEventEnvelope, "v" | "kind" | "sessionId" | "senderDeviceId" | "sequence" | "sentAt">,
): Uint8Array {
  return encoder.encode(
    JSON.stringify([
      envelope.v,
      envelope.kind,
      envelope.sessionId,
      envelope.senderDeviceId,
      envelope.sequence,
      envelope.sentAt,
    ]),
  )
}

export { decoder as utf8Decoder, encoder as utf8Encoder }
