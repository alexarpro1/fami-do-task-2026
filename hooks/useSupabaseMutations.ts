"use client"

import { useRef, useEffect, useCallback } from "react"
import { useFamily } from "@/context/family-context"
import { useSyncId, ensureSyncIdInAuth } from "@/hooks/useSyncId"
import { pushImportedStateToSupabase } from "@/lib/backup-to-supabase"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type { Child, Task, Reward, Rule } from "@/types"

/**
 * Hook für alle Mutations (Aufgabe erledigen, Regel anwenden, Belohnung einlösen,
 * Kind/Aufgabe/Belohnung/Regel hinzufügen). Führt dispatch aus und synchronisiert
 * bei aktivem Cloud-Sync den State mit Supabase. Pushes sind serialisiert, um
 * out-of-order Überschreibungen und Datenverlust zu vermeiden.
 */
export function useSupabaseMutations() {
  const { state, dispatch } = useFamily()
  const { syncId } = useSyncId()
  const pendingPush = useRef(false)
  const pushInFlightRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const runPush = useCallback(() => {
    if (!syncId || !isSupabaseConfigured()) return
    if (pushInFlightRef.current) return
    const stateToPush = stateRef.current
    const lastUpdatedWhenStarted = stateToPush.lastUpdated
    pushInFlightRef.current = true
    ensureSyncIdInAuth(syncId)
      .then((auth) => {
        if (!auth.ok) {
          pushInFlightRef.current = false
          return null
        }
        return pushImportedStateToSupabase(stateToPush, syncId, auth.client)
      })
      .then((res) => {
        pushInFlightRef.current = false
        if (res && !res.ok) console.warn("[useSupabaseMutations] push failed:", res.error)
        if (stateRef.current.lastUpdated !== lastUpdatedWhenStarted) {
          pendingPush.current = true
          runPush()
        }
      })
  }, [syncId])

  useEffect(() => {
    if (!pendingPush.current || !syncId || !isSupabaseConfigured()) return
    pendingPush.current = false
    runPush()
  }, [state.lastUpdated, syncId, runPush])

  const schedulePush = () => {
    pendingPush.current = true
  }

  const completeTask = (taskId: string, childId: string, withTimer = false, _points?: number) => {
    dispatch({
      type: "COMPLETE_TASK",
      payload: { taskId, childId, withTimer },
    })
    schedulePush()
  }

  const applyRule = (ruleId: string, childId: string, _points?: number, note?: string) => {
    dispatch({
      type: "APPLY_RULE",
      payload: { ruleId, childId, note },
    })
    schedulePush()
  }

  const redeemReward = (rewardId: string, childId: string, _cost?: number) => {
    dispatch({
      type: "REDEEM_REWARD",
      payload: { rewardId, childId },
    })
    schedulePush()
  }

  const addChild = (payload: Omit<Child, "id" | "points" | "totalPointsEarned" | "createdAt">) => {
    dispatch({
      type: "ADD_CHILD",
      payload,
    })
    schedulePush()
  }

  const addTask = (payload: Omit<Task, "id" | "order">) => {
    dispatch({
      type: "ADD_TASK",
      payload,
    })
    schedulePush()
  }

  const addReward = (payload: Omit<Reward, "id">) => {
    dispatch({
      type: "ADD_REWARD",
      payload,
    })
    schedulePush()
  }

  const addRule = (payload: Omit<Rule, "id">) => {
    dispatch({
      type: "ADD_RULE",
      payload,
    })
    schedulePush()
  }

  const approveRuleApplication = (applicationId: string) => {
    dispatch({ type: "APPROVE_RULE_APPLICATION", payload: { applicationId } })
    schedulePush()
  }

  const rejectRuleApplication = (applicationId: string) => {
    dispatch({ type: "REJECT_RULE_APPLICATION", payload: { applicationId } })
    schedulePush()
  }

  return {
    completeTask,
    applyRule,
    redeemReward,
    addChild,
    addTask,
    addReward,
    addRule,
    approveRuleApplication,
    rejectRuleApplication,
  }
}
