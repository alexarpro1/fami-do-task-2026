"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSyncId } from "@/hooks/useSyncId"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

const DEVICES_TABLE = "devices"
const DEVICE_ID_KEY = "famiapp-device-id"
const DEVICE_ROLE_KEY = "famiapp_device_role"
const HEARTBEAT_INTERVAL_MS = 60_000

async function getStoredDeviceRole(): Promise<DeviceRole | null> {
  if (typeof window === "undefined") return null
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const { value } = await Preferences.get({ key: DEVICE_ROLE_KEY })
    if (value === "master" || value === "parent" || value === "child") return value
  } catch {
    const v = localStorage.getItem(DEVICE_ROLE_KEY)
    if (v === "master" || v === "parent" || v === "child") return v
  }
  return null
}

export type DeviceRole = "master" | "parent" | "child"

export interface DeviceMeta {
  os_version: string | null
  device_model: string | null
  region_timezone: string | null
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (id) return id
  id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  localStorage.setItem(DEVICE_ID_KEY, id)
  return id
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(DEVICE_ID_KEY) ?? ""
}

function getDeviceMetaFromUA(): Pick<DeviceMeta, "os_version" | "device_model"> {
  if (typeof navigator === "undefined") return { os_version: null, device_model: null }
  const ua = navigator.userAgent
  let os_version: string | null = null
  if (/Android\s+(\d+(?:\.\d+)?)/i.test(ua)) {
    const m = ua.match(/Android\s+(\S+)/i)
    os_version = m ? `Android ${m[1]}` : "Android"
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    const m = ua.match(/OS\s+(\d+[_\d]*)/i)
    os_version = m ? `iOS ${m[1].replace(/_/g, ".")}` : "iOS"
  } else {
    os_version = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : null
  }
  return { os_version, device_model: ua.slice(0, 200) || null }
}

async function getDeviceMeta(): Promise<DeviceMeta> {
  if (typeof window === "undefined") {
    return { os_version: null, device_model: null, region_timezone: null }
  }
  const fallback = getDeviceMetaFromUA()
  let os_version = fallback.os_version
  let device_model = fallback.device_model
  try {
    const { Device } = await import("@capacitor/device")
    const info = await Device.getInfo()
    if (info.osVersion) {
      const os =
        info.operatingSystem === "ios" ? "iOS" : info.operatingSystem === "android" ? "Android" : info.operatingSystem
      os_version = `${os} ${info.osVersion}`.trim()
    }
    if (info.model || info.manufacturer || info.name) {
      const parts = [info.manufacturer, info.model].filter(Boolean)
      device_model = parts.length ? parts.join(" ") : (info.name || info.model || device_model)
    }
  } catch {
    // Web oder @capacitor/device nicht installiert
  }
  const region_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
  return { os_version, device_model, region_timezone }
}

function deriveDeviceName(meta: DeviceMeta): string {
  if (meta.os_version) {
    if (/android/i.test(meta.os_version)) return "Android-Gerät"
    if (/ios/i.test(meta.os_version)) return "iPhone / iPad"
    if (/windows/i.test(meta.os_version)) return "Windows-PC"
    if (/mac/i.test(meta.os_version)) return "Mac"
  }
  return "Unbekanntes Gerät"
}

/**
 * Registriert dieses Gerät in der devices-Tabelle mit eigener device_id.
 * Bestimmt automatisch die Rolle: Erstes Gerät = master, weitere = parent.
 * Sendet alle 60s einen Heartbeat (last_active).
 */
export function useSyncSession(): { deviceId: string } {
  const { syncId } = useSyncId()
  const deviceIdRef = useRef("")
  const registeredRef = useRef(false)

  const upsertDevice = useCallback(async (deviceId: string, sid: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    const meta = await getDeviceMeta()

    const { data: existing } = await supabase
      .from(DEVICES_TABLE)
      .select("device_id")
      .eq("sync_id", sid)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)

    const isFirst = !existing || existing.length === 0 || existing[0].device_id === deviceId
    const storedRole = await getStoredDeviceRole()
    const role: DeviceRole = storedRole ?? (isFirst ? "master" : "parent")

    const { error } = await supabase.from(DEVICES_TABLE).upsert(
      {
        device_id: deviceId,
        sync_id: sid,
        device_name: deriveDeviceName(meta),
        role,
        last_active: new Date().toISOString(),
        os_version: meta.os_version,
        device_model: meta.device_model,
        region_timezone: meta.region_timezone,
        is_active: true,
      },
      { onConflict: "device_id" }
    )
    if (error) console.warn("[useSyncSession] upsert:", error.message)
  }, [])

  const heartbeat = useCallback(async (deviceId: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    const { error } = await supabase
      .from(DEVICES_TABLE)
      .update({ last_active: new Date().toISOString() })
      .eq("device_id", deviceId)
    if (error) console.warn("[useSyncSession] heartbeat:", error.message)
  }, [])

  useEffect(() => {
    if (!syncId || !isSupabaseConfigured()) return

    const deviceId = getOrCreateDeviceId()
    deviceIdRef.current = deviceId

    if (!registeredRef.current) {
      registeredRef.current = true
      void upsertDevice(deviceId, syncId)
    }

    const interval = setInterval(() => {
      void heartbeat(deviceId)
    }, HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [syncId, upsertDevice, heartbeat])

  return { deviceId: deviceIdRef.current || getOrCreateDeviceId() }
}
