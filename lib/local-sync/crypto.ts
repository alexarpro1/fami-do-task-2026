import type { DeviceIdentity, EncryptedPayload, SecureEventEnvelope, SyncEvent } from "./types"
import {
  assertWireSize,
  base64UrlToBytes,
  bytesToBase64Url,
  stableEnvelopeAad,
  utf8Decoder,
  utf8Encoder,
  validateEncryptedPayload,
  validateSyncEvent,
} from "./protocol"
import { LOCAL_SYNC_PROTOCOL_VERSION } from "./types"

const IDENTITY_DB = "famido-local-sync"
const IDENTITY_STORE = "device-keys"
const IDENTITY_KEY = "ecdh-p256-v1"

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("WebCrypto ist auf diesem Gerät nicht verfügbar")
  }
  return globalThis.crypto
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

async function sha256(value: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await getCrypto().subtle.digest("SHA-256", toArrayBuffer(value)))
}

function canonicalPublicJwk(jwk: JsonWebKey): string {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y) {
    throw new Error("Nur ECDH-P-256-Geräteschlüssel werden unterstützt")
  }
  return JSON.stringify({ crv: "P-256", kty: "EC", x: jwk.x, y: jwk.y })
}

export async function fingerprintPublicJwk(jwk: JsonWebKey): Promise<string> {
  return bytesToBase64Url(await sha256(utf8Encoder.encode(canonicalPublicJwk(jwk))))
}

export async function generateDeviceIdentity(): Promise<DeviceIdentity> {
  const pair = (await getCrypto().subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  )) as CryptoKeyPair
  const publicJwk = await getCrypto().subtle.exportKey("jwk", pair.publicKey)
  return {
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicJwk,
    fingerprint: await fingerprintPublicJwk(publicJwk),
  }
}

interface StoredIdentity {
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicJwk: JsonWebKey
}

function openIdentityDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDENTITY_DB, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDENTITY_STORE)) {
        request.result.createObjectStore(IDENTITY_STORE)
      }
    }
    request.onerror = () => reject(request.error ?? new Error("Geräteschlüssel-Datenbank konnte nicht geöffnet werden"))
    request.onsuccess = () => resolve(request.result)
  })
}

async function readStoredIdentity(db: IDBDatabase): Promise<StoredIdentity | null> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(IDENTITY_STORE, "readonly").objectStore(IDENTITY_STORE).get(IDENTITY_KEY)
    request.onerror = () => reject(request.error ?? new Error("Geräteschlüssel konnte nicht gelesen werden"))
    request.onsuccess = () => resolve((request.result as StoredIdentity | undefined) ?? null)
  })
}

async function writeStoredIdentity(db: IDBDatabase, identity: DeviceIdentity): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(IDENTITY_STORE, "readwrite")
    transaction.objectStore(IDENTITY_STORE).put(
      {
        privateKey: identity.privateKey,
        publicKey: identity.publicKey,
        publicJwk: identity.publicJwk,
      } satisfies StoredIdentity,
      IDENTITY_KEY,
    )
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error("Geräteschlüssel konnte nicht gespeichert werden"))
  })
}

/**
 * Persistiert nicht extrahierbare CryptoKeys direkt in IndexedDB. Falls IndexedDB
 * nicht verfügbar ist (SSR/Test), wird bewusst nur eine flüchtige Identität erzeugt.
 */
export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  if (typeof indexedDB === "undefined") return generateDeviceIdentity()
  const db = await openIdentityDatabase()
  try {
    const stored = await readStoredIdentity(db)
    if (stored) {
      return {
        ...stored,
        fingerprint: await fingerprintPublicJwk(stored.publicJwk),
      }
    }
    const identity = await generateDeviceIdentity()
    await writeStoredIdentity(db, identity)
    return identity
  } finally {
    db.close()
  }
}

export interface SessionKeyContext {
  familyId: string
  token: string
  sessionId: string
  childNonce: string
  parentNonce: string
}

async function deriveEcdhSecret(privateKey: CryptoKey, remotePublicJwk: JsonWebKey): Promise<ArrayBuffer> {
  const remotePublicKey = await getCrypto().subtle.importKey(
    "jwk",
    remotePublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  )
  return getCrypto().subtle.deriveBits({ name: "ECDH", public: remotePublicKey }, privateKey, 256)
}

async function deriveAesKey(sharedSecret: ArrayBuffer, salt: Uint8Array, info: Uint8Array): Promise<CryptoKey> {
  const hkdfKey = await getCrypto().subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"])
  return getCrypto().subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: toArrayBuffer(salt), info: toArrayBuffer(info) },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/**
 * HKDF-SHA-256 → raw Bytes (Nearby Fingerprint / Digest-Token, Session-Keys).
 * `length` 16…64 (HKDF extract/expand Limit bewusst klein gehalten).
 */
export async function hkdfSha256(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const byteLength = Math.min(64, Math.max(16, Math.floor(length)))
  const baseKey = await getCrypto().subtle.importKey("raw", toArrayBuffer(ikm), "HKDF", false, [
    "deriveBits",
  ])
  const bits = await getCrypto().subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: toArrayBuffer(salt), info: toArrayBuffer(info) },
    baseKey,
    byteLength * 8,
  )
  return new Uint8Array(bits)
}

/** HMAC-SHA-256 über WebCrypto (Digest-pairingToken, gebundene MACs). */
export async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await getCrypto().subtle.importKey(
    "raw",
    toArrayBuffer(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  return new Uint8Array(await getCrypto().subtle.sign("HMAC", cryptoKey, toArrayBuffer(data)))
}

export async function sha256Bytes(value: Uint8Array): Promise<Uint8Array> {
  return sha256(value)
}

/**
 * Schützt bereits die erste Pairing-Nachricht. Der QR-Code pinnt den
 * Elterngeräteschlüssel; Token und familyId laufen daher nie im Klartext.
 */
export async function derivePairingBootstrapKey(
  privateKey: CryptoKey,
  remotePublicJwk: JsonWebKey,
  parentFingerprint: string,
): Promise<CryptoKey> {
  const sharedSecret = await deriveEcdhSecret(privateKey, remotePublicJwk)
  const salt = await sha256(utf8Encoder.encode(`famido-bootstrap:${parentFingerprint}`))
  const info = utf8Encoder.encode(`famido-local-sync:pair-init:v${LOCAL_SYNC_PROTOCOL_VERSION}`)
  return deriveAesKey(sharedSecret, salt, info)
}

export async function deriveSessionKey(
  privateKey: CryptoKey,
  remotePublicJwk: JsonWebKey,
  context: SessionKeyContext,
): Promise<CryptoKey> {
  const sharedSecret = await deriveEcdhSecret(privateKey, remotePublicJwk)
  const salt = await sha256(utf8Encoder.encode(`famido-local-sync:${context.token}`))
  const info = utf8Encoder.encode(
    JSON.stringify([
      LOCAL_SYNC_PROTOCOL_VERSION,
      context.familyId,
      context.sessionId,
      context.childNonce,
      context.parentNonce,
    ]),
  )
  return deriveAesKey(sharedSecret, salt, info)
}

export async function encryptBytes(
  key: CryptoKey,
  plaintext: Uint8Array,
  additionalData?: Uint8Array,
): Promise<EncryptedPayload> {
  const nonce = getCrypto().getRandomValues(new Uint8Array(12))
  const ciphertext = await getCrypto().subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(nonce),
      additionalData: additionalData ? toArrayBuffer(additionalData) : undefined,
      tagLength: 128,
    },
    key,
    toArrayBuffer(plaintext),
  )
  return {
    nonce: bytesToBase64Url(nonce),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
  }
}

export async function decryptBytes(
  key: CryptoKey,
  encrypted: EncryptedPayload,
  additionalData?: Uint8Array,
): Promise<Uint8Array> {
  const validated = validateEncryptedPayload(encrypted)
  try {
    const plaintext = await getCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(base64UrlToBytes(validated.nonce, 12)),
        additionalData: additionalData ? toArrayBuffer(additionalData) : undefined,
        tagLength: 128,
      },
      key,
      toArrayBuffer(base64UrlToBytes(validated.ciphertext)),
    )
    return new Uint8Array(plaintext)
  } catch {
    throw new Error("Authentifizierung oder Entschlüsselung der lokalen Nachricht fehlgeschlagen")
  }
}

export async function createChallengeProof(
  key: CryptoKey,
  sessionId: string,
  challenge: string,
  direction: "child-to-parent" | "parent-to-child",
): Promise<EncryptedPayload> {
  const aad = utf8Encoder.encode(`famido-pair:${sessionId}:${direction}`)
  return encryptBytes(key, utf8Encoder.encode(challenge), aad)
}

export async function verifyChallengeProof(
  key: CryptoKey,
  sessionId: string,
  expectedChallenge: string,
  proof: EncryptedPayload,
  direction: "child-to-parent" | "parent-to-child",
): Promise<void> {
  const aad = utf8Encoder.encode(`famido-pair:${sessionId}:${direction}`)
  const actual = utf8Decoder.decode(await decryptBytes(key, proof, aad))
  if (actual !== expectedChallenge) throw new Error("Pairing-Challenge stimmt nicht überein")
}

export async function encryptEventEnvelope(
  key: CryptoKey,
  sessionId: string,
  senderDeviceId: string,
  sequence: number,
  event: SyncEvent,
  sentAt = Date.now(),
): Promise<SecureEventEnvelope> {
  const metadata = {
    v: LOCAL_SYNC_PROTOCOL_VERSION,
    kind: "event" as const,
    sessionId,
    senderDeviceId,
    sequence,
    sentAt,
  }
  const encrypted = await encryptBytes(
    key,
    utf8Encoder.encode(JSON.stringify(validateSyncEvent(event))),
    stableEnvelopeAad(metadata),
  )
  const envelope = { ...metadata, ...encrypted }
  assertWireSize(JSON.stringify(envelope))
  return envelope
}

export async function decryptEventEnvelope(key: CryptoKey, envelope: SecureEventEnvelope): Promise<SyncEvent> {
  const plaintext = await decryptBytes(key, envelope, stableEnvelopeAad(envelope))
  let parsed: unknown
  try {
    parsed = JSON.parse(utf8Decoder.decode(plaintext))
  } catch {
    throw new Error("Entschlüsselte Sync-Nachricht ist ungültig")
  }
  return validateSyncEvent(parsed)
}
