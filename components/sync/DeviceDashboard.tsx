"use client"

import { useEffect, useMemo, useState } from "react"
import { Smartphone, Tablet, Unplug, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSyncId, ensureSyncIdInAuth } from "@/hooks/useSyncId"
import { useFamily } from "@/context/family-context"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { pushImportedStateToSupabase } from "@/lib/backup-to-supabase"
import { fetchCloudPreview, fetchConnectedDevices, fetchSyncStats, type DeviceRow } from "@/lib/supabase-sync"
import { GAME_PROGRESS_KEYS } from "@/lib/sync-v2/constants"
import type { FamilyState } from "@/types"

const DEVICE_ID_KEY = "famiapp-device-id"
const SYNC_ID_LENGTH = 6
const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const SYNC_ID_STORAGE_KEY = "famiapp-sync-id"
const SYNC_V2_FAMILY_CODE_KEY = "famiapp_sync_v2_family_code"

function generateSyncId(): string {
  let id = ""
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(SYNC_ID_LENGTH)
    crypto.getRandomValues(arr)
    for (let i = 0; i < SYNC_ID_LENGTH; i++) id += ALPHANUM[arr[i]! % ALPHANUM.length]
  } else {
    for (let i = 0; i < SYNC_ID_LENGTH; i++) id += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]
  }
  return id
}

function formatLastActive(value: string | null): string {
  if (!value) return "unbekannt"
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return "unbekannt"
  const diffMs = Date.now() - ts
  const min = Math.max(0, Math.floor(diffMs / 60000))
  if (min < 1) return "gerade eben"
  if (min < 60) return `vor ${min} Min.`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  return `vor ${days} Tag${days === 1 ? "" : "en"}`
}

function buildEmptyState(current: FamilyState): FamilyState {
  return {
    ...current,
    children: [],
    tasks: [],
    taskCompletions: [],
    rewards: [],
    rewardRedemptions: [],
    rules: [],
    ruleApplications: [],
    pointAdjustments: [],
    pets: [],
    stickerCollections: [],
    moodEntries: [],
    weather: null,
    schoolTimes: [],
    achievements: [],
    selectedChildId: null,
    lastUpdated: new Date().toISOString(),
  }
}

async function allocateUnusedSyncId(maxAttempts = 24): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateSyncId()
    try {
      const preview = await fetchCloudPreview(candidate)
      if (!preview.hasData) return candidate
    } catch {
      // Falls Cloud-Preview temporär fehlschlägt, kann kein sicherer Freiheits-Check stattfinden.
      continue
    }
  }
  return generateSyncId()
}

function clearLocalCachesForFreshStart(): void {
  if (typeof window === "undefined") return
  const keysToRemove = [SYNC_V2_FAMILY_CODE_KEY, ...GAME_PROGRESS_KEYS]
  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}

export function DeviceDashboard() {
  const { syncId, setSyncId } = useSyncId()
  const { state, dispatch } = useFamily()
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [stats, setStats] = useState({ tasks: 0, rewards: 0 })
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [busyMode, setBusyMode] = useState<null | "keep" | "reset">(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!syncId || !isSupabaseConfigured()) return
    const supabase = createClient()

    const load = () => {
      fetchConnectedDevices(syncId).then(setDevices)
      fetchSyncStats(syncId).then(setStats)
    }
    load()

    const channel = supabase.channel(`device-dashboard-${syncId}`)
    channel.on("postgres_changes", { event: "*", schema: "public", table: "devices", filter: `sync_id=eq.${syncId}` }, load)
    channel.on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `sync_id=eq.${syncId}` }, load)
    channel.on("postgres_changes", { event: "*", schema: "public", table: "rewards", filter: `sync_id=eq.${syncId}` }, load)
    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [syncId])

  const currentDeviceId = useMemo(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(DEVICE_ID_KEY)
  }, [])

  const disconnectCurrentDevice = async (newSyncId: string) => {
    const oldSyncId = syncId
    const deviceId = currentDeviceId
    if (deviceId && oldSyncId && isSupabaseConfigured()) {
      const supabase = createClient()
      await supabase.from("devices").delete().eq("id", deviceId).eq("sync_id", oldSyncId)
    }
    setSyncId(newSyncId)
  }

  const handleDisconnectKeepData = async () => {
    if (!syncId) return
    setBusyMode("keep")
    setError(null)
    const newSyncId = await allocateUnusedSyncId()
    await disconnectCurrentDevice(newSyncId)

    const auth = await ensureSyncIdInAuth(newSyncId)
    if (!auth.ok) {
      setBusyMode(null)
      setError("Cloud-Anmeldung fehlgeschlagen. Bitte Seite neu laden.")
      return
    }
    const push = await pushImportedStateToSupabase(state, newSyncId, auth.client)
    if (!push.ok) {
      setBusyMode(null)
      setError(push.error ?? "Cloud-Push fehlgeschlagen.")
      return
    }
    setDisconnectOpen(false)
    setBusyMode(null)
  }

  const handleDisconnectReset = async () => {
    setBusyMode("reset")
    setError(null)
    const newSyncId = await allocateUnusedSyncId()
    const empty = buildEmptyState(state)

    dispatch({ type: "LOAD_STATE", payload: empty })
    if (typeof window !== "undefined") {
      localStorage.setItem("famiapp-state", JSON.stringify(empty))
      localStorage.setItem(SYNC_ID_STORAGE_KEY, newSyncId)
      clearLocalCachesForFreshStart()
    }

    await disconnectCurrentDevice(newSyncId)
    setDisconnectOpen(false)
    setBusyMode(null)
  }

  if (!isSupabaseConfigured() || !syncId) return null

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Verbundene Geräte</p>
        <p className="text-xs text-muted-foreground">
          Synchronisierte Daten: {stats.tasks} Aufgaben, {stats.rewards} Belohnungen
        </p>
      </div>

      <div className="space-y-2">
        {devices.length === 0 ? (
          <p className="text-xs text-muted-foreground">Noch keine Geräte sichtbar.</p>
        ) : (
          devices.map((device) => {
            const label = device.device_name || device.device_model || "Unbenanntes Gerät"
            const isTablet = /ipad|tablet/i.test(label)
            const isCurrent = !!currentDeviceId && device.id === currentDeviceId
            return (
              <div key={device.id} className="flex items-center gap-3 rounded-lg bg-muted/40 p-2">
                {isTablet ? <Tablet className="w-4 h-4 text-primary" /> : <Smartphone className="w-4 h-4 text-primary" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {label} {isCurrent ? "(dieses Gerät)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Zuletzt aktiv: {formatLastActive(device.last_active)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={() => setDisconnectOpen(true)}>
        <Unplug className="w-4 h-4" />
        Gerät trennen
      </Button>

      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Möchtest du dieses Gerät aus der Familie entfernen?</DialogTitle>
            <DialogDescription>
              Das Gerät erhält einen neuen Familien-Code und ist danach von der aktuellen Familie getrennt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Button onClick={handleDisconnectKeepData} disabled={busyMode !== null} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              {busyMode === "keep" ? "Trennen..." : "Daten behalten"}
            </Button>
            <Button onClick={handleDisconnectReset} disabled={busyMode !== null} variant="destructive" className="w-full gap-2">
              <Trash2 className="w-4 h-4" />
              {busyMode === "reset" ? "Neustart..." : "Neustart"}
            </Button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectOpen(false)} disabled={busyMode !== null}>
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
