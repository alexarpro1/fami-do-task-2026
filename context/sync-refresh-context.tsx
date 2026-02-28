"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useSyncId } from "@/hooks/useSyncId"
import { useFamily } from "@/context/family-context"
import { fetchFamilyStateFromSupabase } from "@/lib/supabase-sync"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type { FamilyState } from "@/types"

type SyncRefreshContextValue = {
  refresh: () => Promise<void>
  isRefreshing: boolean
  canRefresh: boolean
}

const SyncRefreshContext = createContext<SyncRefreshContextValue | null>(null)

function mergeFetched(partial: Partial<FamilyState> | null, current: FamilyState): FamilyState | null {
  if (!partial) return null
  return {
    ...current,
    children: partial.children ?? current.children,
    tasks: partial.tasks ?? current.tasks,
    taskCompletions: partial.taskCompletions ?? current.taskCompletions,
    rewards: partial.rewards ?? current.rewards,
    rewardRedemptions: partial.rewardRedemptions ?? current.rewardRedemptions,
    rules: partial.rules ?? current.rules,
    ruleApplications: partial.ruleApplications ?? current.ruleApplications,
  }
}

export function SyncRefreshProvider({ children }: { children: ReactNode }) {
  const { syncId } = useSyncId()
  const { state, dispatch } = useFamily()
  const stateRef = useRef<FamilyState>(state)
  stateRef.current = state

  const [isRefreshing, setIsRefreshing] = useState(false)
  const canRefresh = Boolean(syncId && isSupabaseConfigured())

  const refresh = useCallback(async () => {
    if (!syncId || !isSupabaseConfigured()) return
    setIsRefreshing(true)
    try {
      const partial = await fetchFamilyStateFromSupabase(syncId)
      const merged = mergeFetched(partial, stateRef.current)
      if (merged) {
        dispatch({ type: "LOAD_STATE", payload: merged })
      }
    } catch (err) {
      console.warn("[SyncRefresh] refresh failed:", err)
    } finally {
      setIsRefreshing(false)
    }
  }, [syncId, dispatch])

  const value: SyncRefreshContextValue = { refresh, isRefreshing, canRefresh }

  return (
    <SyncRefreshContext.Provider value={value}>
      {children}
    </SyncRefreshContext.Provider>
  )
}

export function useSyncRefresh(): SyncRefreshContextValue {
  const ctx = useContext(SyncRefreshContext)
  if (!ctx) {
    return {
      refresh: async () => {},
      isRefreshing: false,
      canRefresh: false,
    }
  }
  return ctx
}
