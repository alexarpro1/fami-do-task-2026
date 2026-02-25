"use client"

import { useCallback, useEffect, useState } from "react"
import { usePowerSync } from "@/context/PowerSyncProvider"
import { useFamily } from "@/context/family-context"
import type { ChildRecord } from "@/lib/db/schema"

const TABLE = "children"

/**
 * Anzeige-Profil eines Kindes (aus PowerSync).
 * Kompatibel mit UI, die id, name, avatar, color braucht; Punkte kommen aus useChildPoints.
 */
export interface ChildProfile {
  id: string
  created_at: string
  name: string
  avatar: string
  color: string
  pin: string | null
  is_active: number
  age: number | null
}

function recordToProfile(r: ChildRecord): ChildProfile {
  return {
    id: r.id,
    created_at: r.created_at ?? "",
    name: r.name ?? "",
    avatar: r.avatar ?? "👤",
    color: r.color ?? "#94a3b8",
    pin: r.pin ?? null,
    is_active: r.is_active ?? 1,
    age: r.age ?? null,
  }
}

export interface UseChildrenResult {
  children: ChildProfile[]
  isLoading: boolean
  addChild: (params: { name: string; avatar: string; color: string; pin?: string; age?: number }) => Promise<void>
  updateChild: (id: string, updates: Partial<Pick<ChildProfile, "name" | "avatar" | "color" | "pin" | "age" | "is_active">>) => Promise<void>
  deleteChild: (id: string) => Promise<void>
}

/**
 * Phase 9: Kinder-Profile aus PowerSync (Single Source of Truth).
 * Live-Query für aktive Kinder, CRUD inkl. Soft-Delete (is_active = 0).
 */
export function useChildren(): UseChildrenResult {
  const db = usePowerSync()
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setChildren([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    db.watch(
      `SELECT * FROM ${TABLE} WHERE is_active = 1 ORDER BY created_at ASC, name ASC`,
      [],
      {
        onResult: (result) => {
          const rows = (result.rows?._array ?? []) as ChildRecord[]
          setChildren(rows.map(recordToProfile))
          setIsLoading(false)
        },
        onError: (err) => {
          console.error("[useChildren] watch error:", err)
          setIsLoading(false)
        },
      },
      { signal: controller.signal }
    )

    return () => controller.abort()
  }, [db])

  const addChild = useCallback(
    async (params: { name: string; avatar: string; color: string; pin?: string; age?: number }) => {
      if (!db) return
      const id = crypto.randomUUID()
      const created_at = new Date().toISOString()
      await db.execute(
        `INSERT INTO ${TABLE} (id, created_at, name, avatar, color, pin, is_active, age) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          id,
          created_at,
          params.name,
          params.avatar,
          params.color,
          params.pin ?? null,
          params.age ?? null,
        ]
      )
    },
    [db]
  )

  const updateChild = useCallback(
    async (
      id: string,
      updates: Partial<Pick<ChildProfile, "name" | "avatar" | "color" | "pin" | "age" | "is_active">>
    ) => {
      if (!db) return
      const setClauses: string[] = []
      const values: unknown[] = []
      if (updates.name !== undefined) {
        setClauses.push("name = ?")
        values.push(updates.name)
      }
      if (updates.avatar !== undefined) {
        setClauses.push("avatar = ?")
        values.push(updates.avatar)
      }
      if (updates.color !== undefined) {
        setClauses.push("color = ?")
        values.push(updates.color)
      }
      if (updates.pin !== undefined) {
        setClauses.push("pin = ?")
        values.push(updates.pin)
      }
      if (updates.age !== undefined) {
        setClauses.push("age = ?")
        values.push(updates.age)
      }
      if (updates.is_active !== undefined) {
        setClauses.push("is_active = ?")
        values.push(updates.is_active)
      }
      if (setClauses.length === 0) return
      values.push(id)
      await db.execute(`UPDATE ${TABLE} SET ${setClauses.join(", ")} WHERE id = ?`, values)
    },
    [db]
  )

  const deleteChild = useCallback(
    async (id: string) => {
      if (!db) return
      await updateChild(id, { is_active: 0 })
    },
    [db, updateChild]
  )

  return {
    children,
    isLoading,
    addChild,
    updateChild,
    deleteChild,
  }
}

/**
 * Kinder aus PowerSync + aktuell ausgewähltes Kind aus Context (selectedChildId).
 * Für Header, Sidebar, Tasks-Page: selectedChild kommt aus der PowerSync-Liste.
 */
export function useSelectedChild(): UseChildrenResult & {
  selectedChild: ChildProfile | null
  selectedChildId: string | null
  setSelectedChildId: (id: string | null) => void
} {
  const result = useChildren()
  const { state, dispatch } = useFamily()
  const selectedChildId = state?.selectedChildId ?? null
  const selectedChild = result.children.find((c) => c.id === selectedChildId) ?? null

  const setSelectedChildId = useCallback(
    (id: string | null) => {
      dispatch({ type: "SELECT_CHILD", payload: id })
    },
    [dispatch]
  )

  return {
    ...result,
    selectedChild,
    selectedChildId,
    setSelectedChildId,
  }
}
