/**
 * sync-v2 – Supabase-Adapter für Sync/Backup.
 * Nutzt nur diese Tabelle: sync_v2(family_code, device_id, payload, updated_at).
 */

import { createClient } from "@/lib/supabase/client"
import type { SyncAdapter } from "./types"
import type { SyncPayload } from "../types"

const SYNC_V2_FAMILY_CODE_KEY = "famiapp_sync_v2_family_code"

function getStoredFamilyCode(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(SYNC_V2_FAMILY_CODE_KEY)
}

export function setStoredFamilyCode(code: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SYNC_V2_FAMILY_CODE_KEY, code)
  }
}

export function createSupabaseSyncAdapter(): SyncAdapter {
  return {
    async push(payload: SyncPayload): Promise<{ ok: boolean; error?: string }> {
      const familyCode =
        payload.meta.familyCode || getStoredFamilyCode() || "default"
      try {
        const supabase = createClient()
        const { error } = await supabase.from("sync_v2").upsert(
          {
            family_code: familyCode,
            device_id: payload.meta.deviceId,
            payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "family_code,device_id" },
        )
        if (error) return { ok: false, error: error.message }
        return { ok: true }
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Supabase push failed" }
      }
    },

    async pull(): Promise<{
      ok: boolean
      payload?: SyncPayload
      error?: string
    }> {
      const familyCode = getStoredFamilyCode() || "default"
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("sync_v2")
          .select("payload, updated_at")
          .eq("family_code", familyCode)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) return { ok: false, error: error.message }
        if (!data?.payload) return { ok: true }
        return { ok: true, payload: data.payload as SyncPayload }
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Supabase pull failed" }
      }
    },
  }
}
