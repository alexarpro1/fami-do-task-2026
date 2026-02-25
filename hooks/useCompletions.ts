"use client"

import { useCallback, useEffect, useState } from "react"
import { usePowerSync } from "@/context/PowerSyncProvider"

const TABLE = "task_completions"

/**
 * Phase 7: Completions & Punkte aus PowerSync (Single Source of Truth).
 * completeTask schreibt in task_completions; useChildPoints liest die Summe live.
 */

export function useCompletions() {
  const db = usePowerSync()

  const completeTask = useCallback(
    async (
      taskId: string,
      childId: string,
      points: number,
      options?: { setTaskCompleted?: boolean }
    ) => {
      if (!db) return
      const id = crypto.randomUUID()
      const created_at = new Date().toISOString()
      await db.execute(
        `INSERT INTO ${TABLE} (id, created_at, task_id, child_id, points_awarded) VALUES (?, ?, ?, ?, ?)`,
        [id, created_at, taskId, childId, points]
      )
      if (options?.setTaskCompleted) {
        await db.execute(`UPDATE tasks SET is_completed = 1 WHERE id = ?`, [taskId])
      }
    },
    [db]
  )

  return { completeTask }
}

const REDEMPTIONS_TABLE = "reward_redemptions"
const RULE_APPLICATIONS_TABLE = "rule_applications"

/**
 * Live-Kontostand eines Kindes:
 * SUM(task_completions.points_awarded) - SUM(reward_redemptions.cost_at_redemption) + SUM(rule_applications.points_applied).
 */
export function useChildPoints(childId: string | null): { points: number; isLoading: boolean } {
  const db = usePowerSync()
  const [points, setPoints] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!db || !childId) {
      setPoints(0)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    db.watch(
      `SELECT
        (SELECT COALESCE(SUM(points_awarded), 0) FROM ${TABLE} WHERE child_id = ?) -
        (SELECT COALESCE(SUM(cost_at_redemption), 0) FROM ${REDEMPTIONS_TABLE} WHERE child_id = ?) +
        (SELECT COALESCE(SUM(points_applied), 0) FROM ${RULE_APPLICATIONS_TABLE} WHERE child_id = ?)
      AS balance`,
      [childId, childId, childId],
      {
        onResult: (result) => {
          const row = result.rows?._array?.[0] as { balance: number } | undefined
          const balance = row?.balance ?? 0
          setPoints(Math.max(0, balance))
          setIsLoading(false)
        },
        onError: (err) => {
          console.error("[useChildPoints] watch error:", err)
          setIsLoading(false)
        },
      },
      { signal: controller.signal }
    )

    return () => controller.abort()
  }, [db, childId])

  return { points, isLoading }
}

/**
 * Heutige Completions eines Kindes aus PowerSync (für Erledigt-Status und Tageslimit).
 * Gibt die Menge der heute erledigten task_ids und die Anzahl pro task_id zurück.
 */
export function useTodayCompletionsForChild(childId: string | null): {
  completedTaskIds: Set<string>
  countByTaskId: Record<string, number>
  isLoading: boolean
} {
  const db = usePowerSync()
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set())
  const [countByTaskId, setCountByTaskId] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!db || !childId) {
      setCompletedTaskIds(new Set())
      setCountByTaskId({})
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    db.watch(
      `SELECT task_id, COUNT(*) AS cnt FROM ${TABLE} WHERE child_id = ? AND date(created_at) = date('now','localtime') GROUP BY task_id`,
      [childId],
      {
        onResult: (result) => {
          const rows = (result.rows?._array ?? []) as { task_id: string; cnt: number }[]
          const set = new Set<string>(rows.map((r) => r.task_id))
          const count: Record<string, number> = {}
          for (const r of rows) count[r.task_id] = r.cnt
          setCompletedTaskIds(set)
          setCountByTaskId(count)
          setIsLoading(false)
        },
        onError: (err) => {
          console.error("[useTodayCompletionsForChild] watch error:", err)
          setIsLoading(false)
        },
      },
      { signal: controller.signal }
    )

    return () => controller.abort()
  }, [db, childId])

  return { completedTaskIds, countByTaskId, isLoading }
}

/**
 * Heutige Punkte und Anzahl Completions eines Kindes (für Aufgaben-Seite „Heute: +X Punkte“).
 */
export function useTodayPointsForChild(childId: string | null): {
  pointsToday: number
  countToday: number
  isLoading: boolean
} {
  const db = usePowerSync()
  const [pointsToday, setPointsToday] = useState(0)
  const [countToday, setCountToday] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!db || !childId) {
      setPointsToday(0)
      setCountToday(0)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    db.watch(
      `SELECT COALESCE(SUM(points_awarded), 0) AS total, COUNT(*) AS cnt FROM ${TABLE} WHERE child_id = ? AND date(created_at) = date('now','localtime')`,
      [childId],
      {
        onResult: (result) => {
          const row = (result.rows?._array?.[0]) as { total: number; cnt: number } | undefined
          setPointsToday(Number(row?.total ?? 0))
          setCountToday(Number(row?.cnt ?? 0))
          setIsLoading(false)
        },
        onError: (err) => {
          console.error("[useTodayPointsForChild] watch error:", err)
          setIsLoading(false)
        },
      },
      { signal: controller.signal }
    )

    return () => controller.abort()
  }, [db, childId])

  return { pointsToday, countToday, isLoading }
}
