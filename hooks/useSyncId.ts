"use client"

import { useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

const STORAGE_KEY = "famiapp-sync-id"
const SYNC_ID_LENGTH = 6
const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Phase 15: Export für "Gerät trennen" – neuer Code ohne sofort zu setzen. */
export function generateSyncId(): string {
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

function loadSyncId(): string {
  if (typeof window === "undefined") return ""
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && /^[A-Z0-9]{6}$/i.test(stored)) return stored.toUpperCase()
  const id = generateSyncId()
  localStorage.setItem(STORAGE_KEY, id)
  return id
}

export type EnsureSyncIdResult =
  | { ok: true; client: ReturnType<typeof createClient> }
  | { ok: false }

/**
 * Stellt sicher, dass Supabase Auth (anon) die sync_id im JWT hat, damit RLS greift.
 * Gibt bei Erfolg dieselbe Client-Instanz zurück – diese für den anschließenden Push nutzen.
 */
export async function ensureSyncIdInAuth(syncId: string): Promise<EnsureSyncIdResult> {
  if (!isSupabaseConfigured()) return { ok: false }
  const supabase = createClient()
  let {
    data: { session },
  } = await supabase.auth.getSession()
  let currentSyncId = session?.user?.user_metadata?.sync_id

  if (currentSyncId === syncId) return { ok: true, client: supabase }

  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()
    if (signInError) {
      console.warn("[useSyncId] signInAnonymously:", signInError.message)
      return { ok: false }
    }
    const user = signInData?.user
    if (!user) return { ok: false }
    const { error: updateError } = await supabase.auth.updateUser({
      data: { ...user.user_metadata, sync_id: syncId },
    })
    if (updateError) {
      console.warn("[useSyncId] updateUser:", updateError.message)
      return { ok: false }
    }
    const { error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      console.warn("[useSyncId] refreshSession:", refreshError.message)
      return { ok: false }
    }
    const { data: { session: newSession } } = await supabase.auth.getSession()
    currentSyncId = newSession?.user?.user_metadata?.sync_id
    return currentSyncId === syncId ? { ok: true, client: supabase } : { ok: false }
  } catch (e) {
    console.warn("[useSyncId] ensureSyncIdInAuth:", e)
    return { ok: false }
  }
}

export function useSyncId(): {
  syncId: string
  isLoading: boolean
  setSyncId: (id: string) => void
} {
  const [syncId, setState] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setState(loadSyncId())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!syncId || !isSupabaseConfigured()) return
    void ensureSyncIdInAuth(syncId)
  }, [syncId])

  const setSyncId = (id: string) => {
    const trimmed = id.replace(/\s/g, "").toUpperCase().slice(0, SYNC_ID_LENGTH)
    if (trimmed.length === SYNC_ID_LENGTH) {
      localStorage.setItem(STORAGE_KEY, trimmed)
      setState(trimmed)
      if (isSupabaseConfigured()) void ensureSyncIdInAuth(trimmed)
    }
  }

  return { syncId, isLoading, setSyncId }
}
