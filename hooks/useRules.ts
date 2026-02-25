"use client"

import { useCallback, useEffect, useState } from "react"
import { usePowerSync } from "@/context/PowerSyncProvider"
import type { RuleRecord } from "@/lib/db/schema"

const RULES_TABLE = "rules"
const RULE_APPLICATIONS_TABLE = "rule_applications"

export interface RuleProfile {
  id: string
  created_at: string
  title: string
  point_impact: number
  emoji: string
  is_active: number
}

function recordToProfile(r: RuleRecord): RuleProfile {
  return {
    id: r.id,
    created_at: r.created_at ?? "",
    title: r.title ?? "",
    point_impact: r.point_impact ?? 0,
    emoji: r.emoji ?? "⚖️",
    is_active: r.is_active ?? 1,
  }
}

export interface UseRulesResult {
  rules: RuleProfile[]
  isLoading: boolean
  addRule: (params: { title: string; point_impact: number; emoji: string }) => Promise<void>
  updateRule: (
    id: string,
    updates: Partial<Pick<RuleProfile, "title" | "point_impact" | "emoji" | "is_active">>
  ) => Promise<void>
  deleteRule: (id: string) => Promise<void>
  applyRule: (ruleId: string, childId: string, pointImpact: number) => Promise<void>
}

/**
 * Phase 12: Regeln aus PowerSync (Live-Query + CRUD + Anwenden).
 * point_impact: positiv = Bonus, negativ = Strafe.
 */
export function useRules(): UseRulesResult {
  const db = usePowerSync()
  const [rules, setRules] = useState<RuleProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setRules([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    db.watch(
      `SELECT * FROM ${RULES_TABLE} ORDER BY point_impact DESC, created_at ASC`,
      [],
      {
        onResult: (result) => {
          const rows = (result.rows?._array ?? []) as RuleRecord[]
          setRules(rows.map(recordToProfile))
          setIsLoading(false)
        },
        onError: (err) => {
          console.error("[useRules] watch error:", err)
          setIsLoading(false)
        },
      },
      { signal: controller.signal }
    )

    return () => controller.abort()
  }, [db])

  const addRule = useCallback(
    async (params: { title: string; point_impact: number; emoji: string }) => {
      if (!db) return
      const id = crypto.randomUUID()
      const created_at = new Date().toISOString()
      await db.execute(
        `INSERT INTO ${RULES_TABLE} (id, created_at, title, point_impact, emoji, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
        [id, created_at, params.title, params.point_impact, params.emoji]
      )
    },
    [db]
  )

  const updateRule = useCallback(
    async (
      id: string,
      updates: Partial<Pick<RuleProfile, "title" | "point_impact" | "emoji" | "is_active">>
    ) => {
      if (!db) return
      const setClauses: string[] = []
      const values: unknown[] = []
      if (updates.title !== undefined) {
        setClauses.push("title = ?")
        values.push(updates.title)
      }
      if (updates.point_impact !== undefined) {
        setClauses.push("point_impact = ?")
        values.push(updates.point_impact)
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
      await db.execute(
        `UPDATE ${RULES_TABLE} SET ${setClauses.join(", ")} WHERE id = ?`,
        values
      )
    },
    [db]
  )

  const deleteRule = useCallback(
    async (id: string) => {
      if (!db) return
      await db.execute(`UPDATE ${RULES_TABLE} SET is_active = 0 WHERE id = ?`, [id])
    },
    [db]
  )

  const applyRule = useCallback(
    async (ruleId: string, childId: string, pointImpact: number) => {
      if (!db) return
      const id = crypto.randomUUID()
      const created_at = new Date().toISOString()
      await db.execute(
        `INSERT INTO ${RULE_APPLICATIONS_TABLE} (id, created_at, rule_id, child_id, points_applied) VALUES (?, ?, ?, ?, ?)`,
        [id, created_at, ruleId, childId, pointImpact]
      )
    },
    [db]
  )

  return {
    rules,
    isLoading,
    addRule,
    updateRule,
    deleteRule,
    applyRule,
  }
}
