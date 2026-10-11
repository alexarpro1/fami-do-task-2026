"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { getDeviceId } from "@/hooks/useSyncSession"
import type { DeviceRole } from "@/hooks/useSyncSession"

const DEVICE_ROLE_KEY = "famiapp_device_role"

async function getStoredRole(): Promise<DeviceRole> {
  if (typeof window === "undefined") return "child"
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const { value } = await Preferences.get({ key: DEVICE_ROLE_KEY })
    if (value === "master" || value === "parent" || value === "child") return value
  } catch {
    const v = localStorage.getItem(DEVICE_ROLE_KEY)
    if (v === "master" || v === "parent" || v === "child") return v
  }
  return "child"
}

async function setStoredRole(role: DeviceRole): Promise<void> {
  if (typeof window === "undefined") return
  try {
    const { Preferences } = await import("@capacitor/preferences")
    await Preferences.set({ key: DEVICE_ROLE_KEY, value: role })
  } catch {
    localStorage.setItem(DEVICE_ROLE_KEY, role)
  }
}

/**
 * Phase 18: Geräte-Rolle (parent/child/master) für dieses Gerät.
 * Persistiert lokal (Preferences/localStorage) und optional in Supabase devices.role.
 * Default: "child". Wird für Anzeige des PendingApprovalsWidget (nur parent/master) genutzt.
 */
export function useDeviceRole(): [DeviceRole, (role: DeviceRole) => Promise<void>] {
  const [role, setRoleState] = useState<DeviceRole>("child")

  useEffect(() => {
    getStoredRole().then(setRoleState)
  }, [])

  const setRole = useCallback(async (newRole: DeviceRole) => {
    await setStoredRole(newRole)
    setRoleState(newRole)
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      const deviceId = getDeviceId()
      if (deviceId) {
        const { error } = await supabase
          .from("devices")
          .update({ role: newRole })
          .eq("device_id", deviceId)
        if (error) console.warn("[useDeviceRole] Supabase update:", error.message)
      }
    }
  }, [])

  return [role, setRole]
}
