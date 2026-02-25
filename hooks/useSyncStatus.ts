"use client"

import { useCallback, useEffect, useState } from "react"
import { usePowerSync } from "@/context/PowerSyncProvider"
import { reconnectPowerSync } from "@/lib/db/setup"

export interface SyncStatusState {
  connected: boolean
  connecting: boolean
  downloading: boolean
  uploading: boolean
  lastSyncedAt: Date | string | null
}

const initial: SyncStatusState = {
  connected: false,
  connecting: false,
  downloading: false,
  uploading: false,
  lastSyncedAt: null,
}

function statusToState(db: { currentStatus: { connected: boolean; connecting: boolean; lastSyncedAt?: Date; dataFlowStatus?: { downloading?: boolean; uploading?: boolean } } }): SyncStatusState {
  const s = db.currentStatus
  const dataFlow = s.dataFlowStatus ?? {}
  return {
    connected: s.connected,
    connecting: s.connecting,
    downloading: !!dataFlow.downloading,
    uploading: !!dataFlow.uploading,
    lastSyncedAt: s.lastSyncedAt ? s.lastSyncedAt.toISOString() : null,
  }
}

export interface UseSyncStatusResult extends SyncStatusState {
  reconnect: () => Promise<void>
}

/**
 * Beobachtet den PowerSync-Verbindungs- und Sync-Status (db.currentStatus)
 * und liefert reconnect() für manuelles Neuverbinden.
 */
export function useSyncStatus(): UseSyncStatusResult {
  const db = usePowerSync()
  const [state, setState] = useState<SyncStatusState>(initial)

  useEffect(() => {
    if (!db) {
      setState(initial)
      return
    }

    setState(statusToState(db))

    const unsubscribe = db.registerListener({
      statusChanged: (status) => {
        const dataFlow = status.dataFlowStatus ?? {}
        setState({
          connected: status.connected,
          connecting: status.connecting,
          downloading: !!dataFlow.downloading,
          uploading: !!dataFlow.uploading,
          lastSyncedAt: status.lastSyncedAt ? status.lastSyncedAt.toISOString() : null,
        })
      },
    })

    return () => {
      unsubscribe()
    }
  }, [db])

  const reconnect = useCallback(async () => {
    await reconnectPowerSync()
  }, [])

  return {
    ...state,
    reconnect,
  }
}
