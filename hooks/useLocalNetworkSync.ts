"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  INITIAL_LOCAL_SYNC_STATE,
  getLocalNetworkSyncRuntime,
  type DiscoveredPeer,
  type LocalSyncState,
  type QrPairingPayload,
  type SyncEvent,
} from "@/lib/local-sync"
import { NEARBY_DISCOVERY_TIMEOUT_MS } from "@/lib/nearby/transport-contract"

export interface UseLocalNetworkSyncOptions {
  familyId: string
  deviceId: string
  onEvent?: (event: SyncEvent) => void
}

export interface LocalPairingCode {
  payload: QrPairingPayload
  encoded: string
  /** mDNS/Native serviceId für Dual-Radio lanHint. */
  serviceId?: string
}

export type LocalDiscoveryPhase = "idle" | "searching" | "complete" | "error"

export interface LocalDiscoveryState {
  phase: LocalDiscoveryPhase
  error: string | null
}

const DISCOVERY_WINDOW_MS = NEARBY_DISCOVERY_TIMEOUT_MS

/**
 * Additiver Einstiegspunkt für lokalen WLAN-Sync. Der bestehende Cloud-Sync
 * bleibt unabhängig; erst ein aufrufendes Panel aktiviert diesen Transport.
 */
export function useLocalNetworkSync({ familyId, deviceId, onEvent }: UseLocalNetworkSyncOptions) {
  const client = useMemo(
    () => getLocalNetworkSyncRuntime(familyId, deviceId),
    [deviceId, familyId],
  )
  const [state, setState] = useState<LocalSyncState>(INITIAL_LOCAL_SYNC_STATE)
  const [peers, setPeers] = useState<DiscoveredPeer[]>([])
  const [pairingCode, setPairingCode] = useState<LocalPairingCode | null>(null)
  const [discovery, setDiscovery] = useState<LocalDiscoveryState>({
    phase: "idle",
    error: null,
  })
  const onEventRef = useRef(onEvent)
  const discoveryRunRef = useRef(0)
  const discoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    const unsubscribeState = client.subscribeState(setState)
    const unsubscribeEvents = client.subscribe((event) => onEventRef.current?.(event))
    return () => {
      unsubscribeState()
      unsubscribeEvents()
    }
  }, [client])

  const clearDiscoveryTimer = useCallback(() => {
    if (discoveryTimerRef.current) {
      clearTimeout(discoveryTimerRef.current)
      discoveryTimerRef.current = null
    }
  }, [])

  const stopDiscovery = useCallback(async () => {
    discoveryRunRef.current += 1
    clearDiscoveryTimer()
    await client.stopPeerDiscovery()
    setDiscovery((current) => ({
      phase: current.phase === "error" ? "error" : "complete",
      error: current.error,
    }))
  }, [clearDiscoveryTimer, client])

  useEffect(() => {
    return () => {
      discoveryRunRef.current += 1
      clearDiscoveryTimer()
      void client.stopPeerDiscovery()
    }
  }, [clearDiscoveryTimer, client])

  const host = useCallback(
    async (port?: number) => {
      const code = await client.startParent(port)
      setPairingCode(code)
      return code
    },
    [client],
  )

  const discover = useCallback(async () => {
    const run = discoveryRunRef.current + 1
    discoveryRunRef.current = run
    clearDiscoveryTimer()
    setPeers([])
    setDiscovery({ phase: "searching", error: null })
    try {
      await client.discoverPeers(
        (peer) => {
          if (discoveryRunRef.current !== run) return
          setPeers((current) => {
            const withoutDuplicate = current.filter((item) => item.serviceId !== peer.serviceId)
            return [...withoutDuplicate, peer].sort((a, b) => a.name.localeCompare(b.name))
          })
        },
        (peer) => {
          if (discoveryRunRef.current !== run) return
          setPeers((current) => current.filter((item) => item.serviceId !== peer.serviceId))
        },
      )
      discoveryTimerRef.current = setTimeout(() => {
        if (discoveryRunRef.current !== run) return
        discoveryTimerRef.current = null
        void client.stopPeerDiscovery().finally(() => {
          if (discoveryRunRef.current === run) {
            setDiscovery({ phase: "complete", error: null })
          }
        })
      }, DISCOVERY_WINDOW_MS)
    } catch (cause) {
      if (discoveryRunRef.current !== run) return
      const nativeError = cause as { code?: string; message?: string }
      const message = [nativeError?.code, nativeError?.message]
        .filter((part): part is string => typeof part === "string" && part.length > 0)
        .join(": ") || String(cause)
      setDiscovery({ phase: "error", error: message })
      await client.stopPeerDiscovery().catch(() => undefined)
    }
  }, [clearDiscoveryTimer, client])

  const connect = useCallback(
    async (encodedQrPayload: string, peer?: DiscoveredPeer) => {
      clearDiscoveryTimer()
      await client.connectChild(encodedQrPayload, peer)
    },
    [clearDiscoveryTimer, client],
  )

  /**
   * Nach Dual-Radio-Bulk: sichere Sync-v3-Sitzung ohne QR starten
   * (Parent liefert pairing-invite über WLAN).
   */
  const connectFromDualRadio = useCallback(
    async (peer?: DiscoveredPeer) => {
      clearDiscoveryTimer()
      await client.connectChildFromDualRadio(peer)
    },
    [clearDiscoveryTimer, client],
  )

  const send = useCallback(
    async <T,>(type: string, payload: T) => client.send(type, payload),
    [client],
  )

  const disconnect = useCallback(async () => {
    discoveryRunRef.current += 1
    clearDiscoveryTimer()
    await client.disconnect()
    setPairingCode(null)
    setPeers([])
    setDiscovery({ phase: "idle", error: null })
  }, [clearDiscoveryTimer, client])

  useEffect(() => {
    if (discovery.phase !== "searching" || state.phase !== "error" || !state.error) return
    discoveryRunRef.current += 1
    clearDiscoveryTimer()
    setDiscovery({ phase: "error", error: state.error })
    void client.stopPeerDiscovery().catch(() => undefined)
  }, [clearDiscoveryTimer, client, discovery.phase, state.error, state.phase])

  return {
    channel: client,
    available: client.available,
    state,
    peers,
    discovery,
    pairingCode,
    host,
    discover,
    stopDiscovery,
    connect,
    connectFromDualRadio,
    send,
    disconnect,
  }
}
