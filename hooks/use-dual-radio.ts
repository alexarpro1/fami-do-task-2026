"use client"

/**
 * Minimaler Hook für Dual-Radio (BLE-Presence → WLAN-Bulk oder BLE-Bulk/Relay).
 * Parent: announceHost nach startParent (lanHint + Token).
 * Child: autoUpgrade wenn Digest-Match + lanHint + Token (WLAN bevorzugt).
 * Hintergrund-Sync: optional Foreground Service (Notification) auf Android.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { loadOrCreateDeviceIdentity } from "@/lib/local-sync/crypto"
import type { DeviceIdentity } from "@/lib/local-sync/types"
import {
  acceptPresencePairingToken,
  buildPresenceDigest,
  compactPublicJwk,
  computeQueueHash,
  createBleNearbyEventTransport,
  createDualRadioCoordinator,
  createStoreAndForwardSession,
  deriveShortFamilyFingerprint,
  establishBleSessionCrypto,
  expandCompactPublicJwk,
  getBluetoothNearbySession,
  getNearbySession,
  mintDigestPairingToken,
  peerFromLanHint,
  runBleBulkSync,
  runStoreAndForward,
  type BleSessionRole,
  type DualRadioBulkKind,
  type DualRadioPhase,
  type PresenceDigest,
  type PresenceMatch,
  type StoreAndForwardSession,
} from "@/lib/nearby"
import type { EventSyncEngine, LocalEventQueue } from "@/lib/sync-v3"

export interface UseDualRadioOptions {
  deviceId: string
  familyId: string
  /** Optional: Token aus Parent-Host/QR für autoUpgrade (Fallback). */
  pairingToken?: string
  autoUpgrade?: boolean
  lanHint?: PresenceDigest["lanHint"]
  /** Sync-v3 pending Event-IDs → queueHash im Digest. */
  pendingEventIds?: readonly string[]
  enabled?: boolean
  /** Nach Bulk + plan.sync: Engine für 1:1 Store-and-Forward. */
  syncEngine?: EventSyncEngine | null
  /** Queue für BLE-Bulk Sync-v3 (Direct/Relay). */
  syncQueue?: LocalEventQueue | null
  /** Nur ausführen wenn sicherer LAN-Kanal verbunden ist. */
  secureChannelReady?: boolean
  /**
   * Während aktiver Dual-Radio-Sitzung Foreground Service starten
   * (Hintergrund-Sync mit Notification). Default: true auf Native.
   */
  backgroundSync?: boolean
  /** Notification-Titel (i18n vom Aufrufer). */
  backgroundSyncTitle?: string
  /** Notification-Text (i18n vom Aufrufer). */
  backgroundSyncText?: string
  /**
   * BLE Session-Crypto-Rolle: Parent = responder (wartet auf hello),
   * Child = initiator. Default: initiator.
   */
  bleCryptoRole?: BleSessionRole
  /** i18n: FGS/Notification-Permission verweigert. */
  backgroundSyncPermissionDeniedMessage?: string
  /** i18n: BLE-Sync ohne Pairing-Token. */
  bleTokenRequiredMessage?: string
}

export function useDualRadio({
  deviceId,
  familyId,
  pairingToken,
  autoUpgrade = false,
  lanHint,
  pendingEventIds,
  enabled = false,
  syncEngine = null,
  syncQueue = null,
  secureChannelReady = false,
  backgroundSync = true,
  backgroundSyncTitle,
  backgroundSyncText,
  bleCryptoRole = "initiator",
  backgroundSyncPermissionDeniedMessage,
  bleTokenRequiredMessage,
}: UseDualRadioOptions) {
  const [familyFingerprint, setFamilyFingerprint] = useState("")
  useEffect(() => {
    let cancelled = false
    void deriveShortFamilyFingerprint(familyId || "local-unpaired").then((fp) => {
      if (!cancelled) setFamilyFingerprint(fp)
    })
    return () => {
      cancelled = true
    }
  }, [familyId])
  const queueHash = useMemo(
    () => computeQueueHash(pendingEventIds ?? []),
    [pendingEventIds],
  )
  const [phase, setPhase] = useState<DualRadioPhase>("idle")
  const [bulkKind, setBulkKind] = useState<DualRadioBulkKind>(null)
  const [match, setMatch] = useState<PresenceMatch | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [forwardSession, setForwardSession] = useState<StoreAndForwardSession | null>(null)
  const [lastForwardResult, setLastForwardResult] = useState<string | null>(null)
  const [foregroundOnly, setForegroundOnly] = useState(true)
  const [foregroundService, setForegroundService] = useState(false)
  const [appInForeground, setAppInForeground] = useState(true)
  const [syncPausedInBackground, setSyncPausedInBackground] = useState(false)
  const [backgroundSyncEnabled, setBackgroundSyncEnabled] = useState(backgroundSync)
  const engineRef = useRef(syncEngine)
  engineRef.current = syncEngine
  const lastDigestRef = useRef<PresenceDigest | null>(null)
  const fgsActiveRef = useRef(false)
  /** Generationen-Zähler: veraltete Start/Stop-Promises ignorieren (Race). */
  const fgsGenerationRef = useRef(0)
  const fgsOpRef = useRef<Promise<unknown>>(Promise.resolve())

  const bleTransportRef = useRef<ReturnType<typeof createBleNearbyEventTransport> | null>(
    null,
  )
  const bleCryptoRef = useRef<Awaited<ReturnType<typeof establishBleSessionCrypto>> | null>(
    null,
  )
  const [localIdentity, setLocalIdentity] = useState<DeviceIdentity | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void loadOrCreateDeviceIdentity().then((identity) => {
      if (!cancelled) setLocalIdentity(identity)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  const coordinator = useMemo(() => {
    if (!enabled || !localIdentity || !familyFingerprint) return null
    return createDualRadioCoordinator({
      deviceId,
      familyFingerprint,
      familyId,
      localIdentity,
      discovery: getBluetoothNearbySession(),
      bulk: getNearbySession(),
      pairingToken,
      autoUpgrade,
      preferWlanBulk: true,
      allowBleBulk: true,
      enableRelay: true,
      onStoreAndForward: setForwardSession,
      onRelayDeliver: (envelope) => {
        bleTransportRef.current?.ingestRelayEnvelope(envelope)
      },
    })
  }, [autoUpgrade, deviceId, enabled, familyFingerprint, familyId, localIdentity, pairingToken])

  useEffect(() => {
    if (!coordinator) return
    const offPhase = coordinator.onPhase((next) => {
      setPhase(next)
      setBulkKind(coordinator.getBulkKind())
    })
    const offMatch = coordinator.onMatch(setMatch)
    return () => {
      offPhase()
      offMatch()
      void coordinator.stop()
    }
  }, [coordinator])

  const buildDigest = useCallback(
    (overrides?: Partial<PresenceDigest>) => {
      let e2ePk = overrides?.e2ePk
      if (!e2ePk && localIdentity) {
        try {
          e2ePk = compactPublicJwk(localIdentity.publicJwk)
        } catch {
          e2ePk = undefined
        }
      }
      return buildPresenceDigest({
        deviceId,
        familyIdOrFingerprint: familyFingerprint,
        fingerprintReady: true,
        wantsBulk: overrides?.wantsBulk ?? true,
        queueHash: overrides?.queueHash ?? queueHash,
        lanHint: overrides?.lanHint ?? lanHint,
        pairingToken: overrides?.pairingToken ?? pairingToken,
        bleBulkCapable: overrides?.bleBulkCapable ?? true,
        e2ePk,
      })
    },
    [deviceId, familyFingerprint, lanHint, localIdentity, pairingToken, queueHash],
  )

  const refreshBleStatus = useCallback(async () => {
    try {
      const ble = getBluetoothNearbySession()
      if (!ble.available || !("status" in ble)) return
      const status = await ble.status()
      const fgs = Boolean(status.foregroundService)
      setForegroundService(fgs)
      setForegroundOnly(status.foregroundOnly !== false && !fgs)
      setAppInForeground(status.foreground !== false)
      setSyncPausedInBackground(!status.foreground && !fgs)
    } catch {
      /* Browser / Plugin fehlt */
    }
  }, [])

  const startForegroundService = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !backgroundSyncEnabled) return false
    // Idempotent: startPresence + announceHost sonst retainCount+=4 und Stop laesst Zombie-FGS
    if (fgsActiveRef.current) {
      setForegroundService(true)
      setForegroundOnly(false)
      setSyncPausedInBackground(false)
      return true
    }
    const generation = ++fgsGenerationRef.current
    const op = fgsOpRef.current.then(async () => {
      if (generation !== fgsGenerationRef.current) return false
      if (fgsActiveRef.current) {
        setForegroundService(true)
        setForegroundOnly(false)
        return true
      }
      try {
        // POST_NOTIFICATIONS verweigert → FGS nicht als erfolgreich vortäuschen
        const { getNativePermissionStatus } = await import("@/lib/device-access-prompts")
        const perms = await getNativePermissionStatus()
        if (perms?.notifications === "denied") {
          if (generation !== fgsGenerationRef.current) return false
          setError(
            backgroundSyncPermissionDeniedMessage ||
              "Hintergrund-Sync: Benachrichtigungen nicht erlaubt",
          )
          fgsActiveRef.current = false
          setForegroundService(false)
          setForegroundOnly(true)
          return false
        }

        const ble = getBluetoothNearbySession()
        if (!ble.available || !("startForegroundSync" in ble)) return false
        const status = await ble.startForegroundSync({
          title: backgroundSyncTitle,
          text: backgroundSyncText,
        })
        // Ein Retain reicht: beide Plugins hoeren auf TransportStopCallback.
        // Zweites startForegroundSync wuerde retainCount verdoppeln.
        if (generation !== fgsGenerationRef.current) {
          // Toggle/Stop hat inzwischen gewonnen — FGS wieder stoppen
          if (status.foregroundService || status.started) {
            await ble.stopForegroundSync().catch(() => undefined)
          }
          return false
        }
        const active = Boolean(status.foregroundService ?? status.started)
        fgsActiveRef.current = active
        setForegroundService(active)
        setForegroundOnly(!active)
        if (!active) {
          setError(
            backgroundSyncPermissionDeniedMessage ||
              "Hintergrund-Sync konnte nicht gestartet werden",
          )
          return false
        }
        setSyncPausedInBackground(false)
        return true
      } catch (cause) {
        if (generation !== fgsGenerationRef.current) return false
        const message = cause instanceof Error ? cause.message : String(cause)
        const permissionDenied =
          /FGS_START_FAILED|permission|Permission|SECURITY_EXCEPTION|ForegroundServiceStartNotAllowed/i.test(
            message,
          )
        setError(
          permissionDenied && backgroundSyncPermissionDeniedMessage
            ? backgroundSyncPermissionDeniedMessage
            : message,
        )
        fgsActiveRef.current = false
        setForegroundService(false)
        setForegroundOnly(true)
        return false
      }
    })
    fgsOpRef.current = op.then(
      () => undefined,
      () => undefined,
    )
    return op
  }, [
    backgroundSyncEnabled,
    backgroundSyncPermissionDeniedMessage,
    backgroundSyncText,
    backgroundSyncTitle,
  ])

  const stopForegroundService = useCallback(async () => {
    const generation = ++fgsGenerationRef.current
    const op = fgsOpRef.current.then(async () => {
      if (!Capacitor.isNativePlatform()) {
        fgsActiveRef.current = false
        setForegroundService(false)
        return
      }
      try {
        const ble = getBluetoothNearbySession()
        if (ble.available && "stopForegroundSync" in ble) {
          await ble.stopForegroundSync()
        }
        // Nur ein Retain (BLE-Start); LAN teilt Lifecycle via TransportStopCallback
      } catch {
        /* ignore */
      } finally {
        if (generation === fgsGenerationRef.current) {
          fgsActiveRef.current = false
          setForegroundService(false)
          setForegroundOnly(true)
        }
      }
    })
    fgsOpRef.current = op.then(
      () => undefined,
      () => undefined,
    )
    await op
  }, [])

  const startPresence = useCallback(
    async (wantsBulk = true) => {
      if (!coordinator) return
      setError(null)
      const digest = buildDigest({ wantsBulk })
      lastDigestRef.current = digest
      try {
        if (backgroundSyncEnabled) {
          await startForegroundService()
        }
        await coordinator.start(digest)
        await refreshBleStatus()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    },
    [
      backgroundSyncEnabled,
      buildDigest,
      coordinator,
      refreshBleStatus,
      startForegroundService,
    ],
  )

  /**
   * Parent nach startParent: lanHint + kurzlebigen Token automatisch announce'n.
   * Retries bei Race (Coordinator gerade erst entstanden).
   */
  const announceHost = useCallback(
    async (input: {
      host: string
      port: number
      serviceId?: string
      pairingToken: string
      wantsBulk?: boolean
    }): Promise<boolean> => {
      setError(null)
      if (!familyFingerprint) return false
      try {
        // Bereits geminteter dpt1-Bearer (aus local.host) oder Legacy → mint
        const { isDigestPairingToken } = await import("@/lib/nearby/presence-digest")
        const digestToken = isDigestPairingToken(input.pairingToken)
          ? input.pairingToken
          : await mintDigestPairingToken({
              rawToken: input.pairingToken,
              familyId,
              deviceId,
            })
        if (!acceptPresencePairingToken(digestToken)) {
          setError("Digest-pairingToken abgelaufen oder ungueltig")
          return false
        }
        const digest = buildDigest({
          wantsBulk: input.wantsBulk ?? true,
          lanHint: {
            host: input.host,
            port: input.port,
            serviceId: input.serviceId,
          },
          pairingToken: digestToken,
        })
        lastDigestRef.current = digest
        if (!coordinator) return false
        if (backgroundSyncEnabled) {
          await startForegroundService()
        }
        const phaseNow = coordinator.getPhase()
        if (phaseNow === "idle" || phaseNow === "stopped" || phaseNow === "error") {
          await coordinator.start(digest)
        } else {
          await coordinator.announce(digest)
        }
        await refreshBleStatus()
        return true
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
        return false
      }
    },
    [
      backgroundSyncEnabled,
      buildDigest,
      coordinator,
      deviceId,
      familyFingerprint,
      familyId,
      refreshBleStatus,
      startForegroundService,
    ],
  )

  /** queueHash nach Sync-v3-Änderungen refreshen. */
  const refreshQueueDigest = useCallback(async () => {
    if (!coordinator) return
    try {
      await coordinator.updateLocalDigest({ queueHash })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [coordinator, queueHash])

  const upgrade = useCallback(async () => {
    if (!coordinator) return
    setError(null)
    try {
      const remote = coordinator.getRemoteDigest()
      if (remote && peerFromLanHint(remote)) {
        await coordinator.upgradeFromRemoteDigest()
      } else {
        await coordinator.enterBleBulk()
      }
      setBulkKind(coordinator.getBulkKind())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [coordinator])

  const stop = useCallback(async () => {
    if (coordinator) {
      await coordinator.stop()
    }
    await stopForegroundService()
    setForwardSession(null)
    setLastForwardResult(null)
    setBulkKind(null)
  }, [coordinator, stopForegroundService])

  const setBackgroundSync = useCallback(
    (next: boolean) => {
      setBackgroundSyncEnabled(next)
      if (!next) {
        void stopForegroundService()
      } else if (enabled && coordinator) {
        const phaseNow = coordinator.getPhase()
        if (phaseNow !== "idle" && phaseNow !== "stopped" && phaseNow !== "error") {
          void startForegroundService()
        }
      }
    },
    [coordinator, enabled, startForegroundService, stopForegroundService],
  )

  const forwardRanRef = useRef<string | null>(null)

  // Store-and-Forward: wenn WLAN-Bulk + sicherer Kanal + Engine bereit (1× pro Peer)
  useEffect(() => {
    if (!secureChannelReady || !syncEngine || phase !== "bulk") return
    const remote = coordinator?.getRemoteDigest()
    const local = coordinator?.getLocalDigest()
    if (!remote || !local) return
    const runKey = `wlan:${remote.deviceId}:${local.queueHash}:${remote.queueHash}`
    if (forwardRanRef.current === runKey) return
    const session =
      forwardSession ?? createStoreAndForwardSession(local, remote)
    if (session.plan.action === "none") {
      forwardRanRef.current = runKey
      return
    }
    let cancelled = false
    forwardRanRef.current = runKey
    void runStoreAndForward(syncEngine, session)
      .then((result) => {
        if (cancelled) return
        setLastForwardResult(
          result.skipped
            ? "skipped"
            : `push:${result.pushed}/pull:${result.applied}`,
        )
        setForwardSession(session)
      })
      .catch((cause) => {
        if (!cancelled) {
          forwardRanRef.current = null
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      })
    return () => {
      cancelled = true
    }
  }, [coordinator, forwardSession, phase, secureChannelReady, syncEngine])

  // BLE-Bulk Sync-v3: erst ECDH-Session, dann Direct (verschlüsselt)
  useEffect(() => {
    if (phase !== "bleBulk" || !syncQueue || !coordinator) return
    const remote = coordinator.getRemoteDigest()
    const local = coordinator.getLocalDigest()
    if (!remote || !local) return
    const token = remote.pairingToken || pairingToken
    if (!acceptPresencePairingToken(token)) {
      setError(
        bleTokenRequiredMessage ??
          "BLE-Sync benötigt Pairing-Token für Session-Keys",
      )
      return
    }
    const runKey = `ble:${remote.deviceId}:${local.queueHash}:${remote.queueHash}`
    if (forwardRanRef.current === runKey) return
    forwardRanRef.current = runKey
    let cancelled = false
    const bleSession = getBluetoothNearbySession()

    void (async () => {
      try {
        const crypto = await establishBleSessionCrypto(bleSession, {
          familyId,
          familyFingerprint,
          pairingToken: token,
          localDeviceId: deviceId,
          peerDeviceId: remote.deviceId,
          role: bleCryptoRole,
        })
        if (cancelled) {
          crypto.dispose()
          return
        }
        bleCryptoRef.current = crypto
        const identity = localIdentity ?? (await loadOrCreateDeviceIdentity())
        // Direct: Link-Crypto. relayE2e bleibt aktiv für Multi-Hop-Deliver (onRelayDeliver).
        const transport = createBleNearbyEventTransport({
          familyId,
          familyFingerprint,
          localDeviceId: deviceId,
          peerDeviceId: remote.deviceId,
          session: bleSession,
          crypto,
          useRelay: false,
          sendRelay: (envelope) => coordinator.sendRelay(envelope),
          relayE2e: {
            localIdentity: identity,
            familyId,
            pairingToken: token,
            resolveTargetPublicJwk: (targetId) => {
              const fromDir = coordinator.resolvePeerE2ePublicJwk(targetId)
              if (fromDir) return fromDir
              if (targetId === remote.deviceId && remote.e2ePk) {
                try {
                  return expandCompactPublicJwk(remote.e2ePk)
                } catch {
                  return null
                }
              }
              return null
            },
          },
        })
        bleTransportRef.current = transport
        const result = await runBleBulkSync(syncQueue, { familyId, deviceId }, transport)
        if (cancelled) return
        setLastForwardResult(
          `ble-push:${result.pushed}/pull:${result.applied}/fail:${result.failed}`,
        )
        transport.dispose()
        if (bleTransportRef.current === transport) bleTransportRef.current = null
      } catch (cause) {
        if (!cancelled) {
          forwardRanRef.current = null
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      } finally {
        if (!cancelled) {
          bleCryptoRef.current?.dispose()
          bleCryptoRef.current = null
        }
      }
    })()

    return () => {
      cancelled = true
      bleTransportRef.current?.dispose()
      bleTransportRef.current = null
      bleCryptoRef.current?.dispose()
      bleCryptoRef.current = null
    }
  }, [
    bleCryptoRole,
    bleTokenRequiredMessage,
    coordinator,
    deviceId,
    familyFingerprint,
    familyId,
    localIdentity,
    pairingToken,
    phase,
    syncQueue,
  ])

  // queueHash-Änderungen an laufenden Digest spiegeln (nicht während Upgrade)
  useEffect(() => {
    if (!coordinator) return
    const current = coordinator.getPhase()
    if (
      current === "idle" ||
      current === "stopped" ||
      current === "upgrading" ||
      current === "error"
    ) {
      return
    }
    const existing = coordinator.getLocalDigest()
    if (existing?.queueHash === queueHash) return
    void coordinator.updateLocalDigest({ queueHash }).catch(() => undefined)
  }, [coordinator, queueHash])

  // BLE-Status periodisch
  useEffect(() => {
    if (!enabled) {
      setSyncPausedInBackground(false)
      return
    }
    void refreshBleStatus()
    const timer = setInterval(() => void refreshBleStatus(), 5_000)
    return () => clearInterval(timer)
  }, [enabled, refreshBleStatus])

  // App-State: mit FGS kein Pause; ohne FGS Resume-Reconnect
  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return
    let remove: (() => void) | undefined
    void import("@capacitor/app").then(({ App }) => {
      const sub = App.addListener("appStateChange", ({ isActive }) => {
        setAppInForeground(isActive)
        void refreshBleStatus().then(() => {
          if (fgsActiveRef.current) {
            setSyncPausedInBackground(false)
            return
          }
          setSyncPausedInBackground(!isActive)
          if (!isActive || !coordinator) return
          const digest = lastDigestRef.current ?? coordinator.getLocalDigest()
          if (!digest) return
          const phaseNow = coordinator.getPhase()
          if (phaseNow === "stopped" || phaseNow === "error" || phaseNow === "idle") {
            void coordinator.start(digest).catch((cause) => {
              setError(cause instanceof Error ? cause.message : String(cause))
            })
          } else if (digest.lanHint || digest.pairingToken) {
            void coordinator.announce(digest).catch(() => undefined)
          }
        })
      })
      void sub.then((handle) => {
        remove = () => {
          void handle.remove()
        }
      })
    })
    return () => {
      remove?.()
    }
  }, [coordinator, enabled, refreshBleStatus])

  // Cleanup FGS wenn Hook disabled
  useEffect(() => {
    if (enabled) return
    void stopForegroundService()
  }, [enabled, stopForegroundService])

  const remoteLanPeer = match?.remote ? peerFromLanHint(match.remote) : null

  return {
    enabled,
    phase,
    bulkKind,
    match,
    error,
    familyFingerprint,
    queueHash,
    forwardSession,
    lastForwardResult,
    foregroundOnly,
    foregroundService,
    appInForeground,
    syncPausedInBackground,
    backgroundSyncEnabled,
    setBackgroundSync,
    remoteLanPeer,
    remotePairingToken: match?.remote.pairingToken ?? null,
    startPresence,
    announceHost,
    refreshQueueDigest,
    refreshBleStatus,
    upgrade,
    stop,
    coordinator,
  }
}
