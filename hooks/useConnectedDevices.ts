"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { getDeviceId, type DeviceRole } from "@/hooks/useSyncSession"

const DEVICES_TABLE = "devices"
const PRESENCE_CHANNEL_PREFIX = "presence:"
const ONLINE_THRESHOLD_MS = 3 * 60_000

export interface ConnectedDevice {
  deviceId: string
  deviceName: string
  role: DeviceRole
  osVersion: string | null
  deviceModel: string | null
  lastActive: string
  isOnline: boolean
  isCurrentDevice: boolean
}

export function useConnectedDevices(syncId: string) {
  const [devices, setDevices] = useState<ConnectedDevice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const onlineSetRef = useRef<Set<string>>(new Set())
  const currentDeviceId = getDeviceId()

  const fetchDevices = useCallback(async () => {
    if (!syncId || !isSupabaseConfigured()) {
      setDevices([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase
      .from(DEVICES_TABLE)
      .select("*")
      .eq("sync_id", syncId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (error) {
      console.warn("[useConnectedDevices] fetch:", error.message)
      setIsLoading(false)
      return
    }

    const now = Date.now()
    const mapped: ConnectedDevice[] = (data ?? []).map((d: Record<string, unknown>) => {
      const id = d.device_id as string
      const lastActive = (d.last_active as string) ?? new Date().toISOString()
      const recentHeartbeat = now - new Date(lastActive).getTime() < ONLINE_THRESHOLD_MS
      return {
        deviceId: id,
        deviceName: (d.device_name as string) ?? "Unbekannt",
        role: (d.role as DeviceRole) ?? "parent",
        osVersion: (d.os_version as string) ?? null,
        deviceModel: (d.device_model as string) ?? null,
        lastActive,
        isOnline: onlineSetRef.current.has(id) || (id === currentDeviceId) || recentHeartbeat,
        isCurrentDevice: id === currentDeviceId,
      }
    })
    setDevices(mapped)
    setIsLoading(false)
  }, [syncId, currentDeviceId])

  useEffect(() => {
    if (!syncId || !isSupabaseConfigured()) return

    fetchDevices()

    const supabase = createClient()

    const presenceChannel = supabase.channel(`${PRESENCE_CHANNEL_PREFIX}${syncId}`)

    presenceChannel.on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState<{ device_id: string }>()
      const onlineIds = new Set<string>()
      for (const key in state) {
        for (const presence of state[key]) {
          if (presence.device_id) onlineIds.add(presence.device_id)
        }
      }
      onlineSetRef.current = onlineIds
      fetchDevices()
    })

    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && currentDeviceId) {
        await presenceChannel.track({ device_id: currentDeviceId })
      }
    })

    const dbChannel = supabase.channel(`devices-changes-${syncId}`)
    dbChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: DEVICES_TABLE, filter: `sync_id=eq.${syncId}` },
      () => fetchDevices()
    )
    dbChannel.subscribe()

    return () => {
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(dbChannel)
    }
  }, [syncId, fetchDevices, currentDeviceId])

  const removeDevice = useCallback(async (deviceId: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    const { error } = await supabase
      .from(DEVICES_TABLE)
      .update({ is_active: false })
      .eq("device_id", deviceId)
    if (error) {
      console.warn("[useConnectedDevices] remove:", error.message)
      return
    }
    await fetchDevices()
  }, [fetchDevices])

  const renameDevice = useCallback(async (deviceId: string, name: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    const { error } = await supabase
      .from(DEVICES_TABLE)
      .update({ device_name: name })
      .eq("device_id", deviceId)
    if (error) {
      console.warn("[useConnectedDevices] rename:", error.message)
      return
    }
    await fetchDevices()
  }, [fetchDevices])

  const disconnectCurrentDevice = useCallback(async () => {
    if (!currentDeviceId || !isSupabaseConfigured()) return
    const supabase = createClient()
    await supabase
      .from(DEVICES_TABLE)
      .update({ is_active: false })
      .eq("device_id", currentDeviceId)
    await fetchDevices()
  }, [currentDeviceId, fetchDevices])

  return {
    devices,
    isLoading,
    removeDevice,
    renameDevice,
    disconnectCurrentDevice,
    refetch: fetchDevices,
  }
}
