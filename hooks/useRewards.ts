"use client"

import { useCallback, useEffect, useState } from "react"
import { usePowerSync } from "@/context/PowerSyncProvider"
import type { RewardRecord } from "@/lib/db/schema"

const REWARDS_TABLE = "rewards"
const REDEMPTIONS_TABLE = "reward_redemptions"

export interface RewardProfile {
  id: string
  created_at: string
  title: string
  cost: number
  emoji: string
  is_active: number
}

function recordToProfile(r: RewardRecord): RewardProfile {
  return {
    id: r.id,
    created_at: r.created_at ?? "",
    title: r.title ?? "",
    cost: r.cost ?? 0,
    emoji: r.emoji ?? "🎁",
    is_active: r.is_active ?? 1,
  }
}

export interface UseRewardsResult {
  rewards: RewardProfile[]
  isLoading: boolean
  addReward: (params: { title: string; cost: number; emoji: string }) => Promise<void>
  updateReward: (
    id: string,
    updates: Partial<Pick<RewardProfile, "title" | "cost" | "emoji" | "is_active">>
  ) => Promise<void>
  deleteReward: (id: string) => Promise<void>
  redeemReward: (rewardId: string, childId: string, cost: number) => Promise<void>
}

/**
 * Phase 10: Belohnungen aus PowerSync (Live-Query + CRUD + Einlösen).
 */
export function useRewards(): UseRewardsResult {
  const db = usePowerSync()
  const [rewards, setRewards] = useState<RewardProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setRewards([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    db.watch(
      `SELECT * FROM ${REWARDS_TABLE} WHERE is_active = 1 ORDER BY cost ASC, created_at ASC`,
      [],
      {
        onResult: (result) => {
          const rows = (result.rows?._array ?? []) as RewardRecord[]
          setRewards(rows.map(recordToProfile))
          setIsLoading(false)
        },
        onError: (err) => {
          console.error("[useRewards] watch error:", err)
          setIsLoading(false)
        },
      },
      { signal: controller.signal }
    )

    return () => controller.abort()
  }, [db])

  const addReward = useCallback(
    async (params: { title: string; cost: number; emoji: string }) => {
      if (!db) return
      const id = crypto.randomUUID()
      const created_at = new Date().toISOString()
      await db.execute(
        `INSERT INTO ${REWARDS_TABLE} (id, created_at, title, cost, emoji, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
        [id, created_at, params.title, params.cost, params.emoji]
      )
    },
    [db]
  )

  const updateReward = useCallback(
    async (
      id: string,
      updates: Partial<Pick<RewardProfile, "title" | "cost" | "emoji" | "is_active">>
    ) => {
      if (!db) return
      const setClauses: string[] = []
      const values: unknown[] = []
      if (updates.title !== undefined) {
        setClauses.push("title = ?")
        values.push(updates.title)
      }
      if (updates.cost !== undefined) {
        setClauses.push("cost = ?")
        values.push(updates.cost)
      }
      if (updates.emoji !== undefined) {
        setClauses.push("emoji = ?")
        values.push(updates.emoji)
      }
      if (updates.is_active !== undefined) {
        setClauses.push("is_active = ?")
        values.push(updates.is_active)
      }
      if (setClauses.length === 0) return
      values.push(id)
      await db.execute(`UPDATE ${REWARDS_TABLE} SET ${setClauses.join(", ")} WHERE id = ?`, values)
    },
    [db]
  )

  const deleteReward = useCallback(
    async (id: string) => {
      if (!db) return
      await updateReward(id, { is_active: 0 })
    },
    [db, updateReward]
  )

  const redeemReward = useCallback(
    async (rewardId: string, childId: string, cost: number) => {
      if (!db) return
      const id = crypto.randomUUID()
      const created_at = new Date().toISOString()
      await db.execute(
        `INSERT INTO ${REDEMPTIONS_TABLE} (id, created_at, reward_id, child_id, cost_at_redemption) VALUES (?, ?, ?, ?, ?)`,
        [id, created_at, rewardId, childId, cost]
      )
    },
    [db]
  )

  return {
    rewards,
    isLoading,
    addReward,
    updateReward,
    deleteReward,
    redeemReward,
  }
}
