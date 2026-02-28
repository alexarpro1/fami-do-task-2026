"use client"

import { useEffect, useRef } from "react"
import { useSyncId } from "@/hooks/useSyncId"
import { useFamily } from "@/context/family-context"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { fetchFamilyStateFromSupabase } from "@/lib/supabase-sync"
import { getDeviceId } from "@/hooks/useSyncSession"
import type { FamilyState } from "@/types"

const PRESENCE_CHANNEL_PREFIX = "presence:"

/**
 * Nur Zuhörer: Initialer Fetch, Realtime-Subscriptions, Presence.
 * Kein Schreiben in die Cloud – Mutationen laufen über den Sync-Layer (supabase-mutations).
 */
export function SupabaseDataLoader() {
  const { syncId } = useSyncId()
  const { state, dispatch } = useFamily()
  const hasFetchedRef = useRef<string | null>(null)
  const stateRef = useRef<FamilyState>(state)
  stateRef.current = state

  const applyFetched = (partial: Partial<FamilyState> | null, current: FamilyState) => {
    if (!partial) return
    const merged: FamilyState = {
      ...current,
      children: partial.children ?? current.children,
      tasks: partial.tasks ?? current.tasks,
      taskCompletions: partial.taskCompletions ?? current.taskCompletions,
      rewards: partial.rewards ?? current.rewards,
      rewardRedemptions: partial.rewardRedemptions ?? current.rewardRedemptions,
      rules: partial.rules ?? current.rules,
      ruleApplications: partial.ruleApplications ?? current.ruleApplications,
    }
    dispatch({ type: "LOAD_STATE", payload: merged })
  }

  useEffect(() => {
    if (!syncId || !isSupabaseConfigured()) return

    const runFetch = () => {
      fetchFamilyStateFromSupabase(syncId)
        .then((partial) => {
          applyFetched(partial, stateRef.current)
          initialFetchDoneRef.current = true
        })
        .catch((err) => console.warn("[SupabaseDataLoader] fetch failed:", err))
    }

    if (hasFetchedRef.current !== syncId) {
      hasFetchedRef.current = syncId
      runFetch()
    }

    const supabase = createClient()

    // Realtime: Postgres Changes für Datentabellen
    const tables = [
      "children",
      "tasks",
      "task_completions",
      "rewards",
      "reward_redemptions",
      "rules",
      "rule_applications",
    ] as const
    const dataChannel = supabase.channel("sync-all")
    tables.forEach((table) => {
      dataChannel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `sync_id=eq.${syncId}` },
        () => runFetch()
      )
    })
    dataChannel.subscribe()

    // Presence: Dieses Gerät als online tracken
    const deviceId = getDeviceId()
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null
    if (deviceId) {
      presenceChannel = supabase.channel(`${PRESENCE_CHANNEL_PREFIX}${syncId}`)
      presenceChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel!.track({ device_id: deviceId })
        }
      })
    }

    return () => {
      supabase.removeChannel(dataChannel)
      if (presenceChannel) supabase.removeChannel(presenceChannel)
    }
  }, [syncId])

  return null
}
