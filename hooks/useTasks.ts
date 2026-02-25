"use client"

import { useCallback, useEffect, useState } from "react"
import { usePowerSync } from "@/context/PowerSyncProvider"
import type { TaskRecord } from "@/lib/db/schema"

/** Optionale Felder für addTask (Schema-Felder) */
export interface AddTaskOptions {
  description?: string | null
  category?: string | null
  emoji?: string | null
  order?: number | null
  is_active?: number | null
  days?: string | null
}

export interface UseTasksResult {
  tasks: TaskRecord[]
  isLoading: boolean
  addTask: (
    title: string,
    assignedTo: string,
    points: number,
    options?: AddTaskOptions
  ) => Promise<void>
  toggleTaskStatus: (id: string, isCompleted: boolean) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

const TASKS_TABLE = "tasks"
const WATCH_SQL = `SELECT * FROM ${TASKS_TABLE} ORDER BY "order" ASC, created_at ASC`

/**
 * Data Access Layer für Tasks: Live-Query + CRUD über die PowerSync-DB.
 * Nutzt usePowerSync() und db.watch() für reaktive Updates.
 */
export function useTasks(): UseTasksResult {
  const db = usePowerSync()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Live-Query: bei Änderungen an tasks sofort neu abfragen
  useEffect(() => {
    if (!db) {
      setTasks([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    db.watch(
      WATCH_SQL,
      [],
      {
        onResult: (result) => {
          const rows = result.rows?._array ?? []
          setTasks(rows as TaskRecord[])
          setIsLoading(false)
        },
        onError: (err) => {
          console.error("[useTasks] watch error:", err)
          setIsLoading(false)
        },
      },
      { signal: controller.signal }
    )

    return () => {
      controller.abort()
    }
  }, [db])

  const addTask = useCallback(
    async (
      title: string,
      assignedTo: string,
      points: number,
      options?: AddTaskOptions
    ) => {
      if (!db) return
      const id = crypto.randomUUID()
      const created_at = new Date().toISOString()
      const is_completed = 0
      const description = options?.description ?? null
      const category = options?.category ?? null
      const emoji = options?.emoji ?? null
      const order = options?.order ?? 0
      const is_active = options?.is_active ?? 1
      const days = options?.days ?? null

      await db.execute(
        `INSERT INTO ${TASKS_TABLE} (id, created_at, title, is_completed, assigned_to, points, description, category, emoji, "order", is_active, days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          created_at,
          title,
          is_completed,
          assignedTo,
          points,
          description,
          category,
          emoji,
          order,
          is_active,
          days,
        ]
      )
    },
    [db]
  )

  const toggleTaskStatus = useCallback(
    async (id: string, isCompleted: boolean) => {
      if (!db) return
      await db.execute(
        `UPDATE ${TASKS_TABLE} SET is_completed = ? WHERE id = ?`,
        [isCompleted ? 1 : 0, id]
      )
    },
    [db]
  )

  const deleteTask = useCallback(
    async (id: string) => {
      if (!db) return
      await db.execute(`DELETE FROM ${TASKS_TABLE} WHERE id = ?`, [id])
    },
    [db]
  )

  return {
    tasks,
    isLoading,
    addTask,
    toggleTaskStatus,
    deleteTask,
  }
}
