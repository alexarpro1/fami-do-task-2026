"use client"

import { useMemo } from "react"
import type { Task, TaskCategory } from "@/types"
import { useFamily } from "@/context/family-context"
import { TaskCard } from "./task-card"
import { EmptyState } from "@/components/ui/empty-state"

interface TaskListProps {
  category: TaskCategory | "all"
  childId: string
  showHidden?: boolean // Option to show filtered-out tasks
}

function checkTaskAvailability(
  task: Task,
  childId: string,
  todayCompletions: { taskId: string; childId: string }[],
): {
  isAvailable: boolean
  reason: string | null
  timeStatus: "available" | "upcoming" | "overdue" | null
  limitRemaining: number | null
} {
  const now = new Date()
  const currentDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // 1. Check if task is active
  if (!task.isActive) {
    return { isAvailable: false, reason: "deaktiviert", timeStatus: null, limitRemaining: null }
  }

  // 2. Day check - Is today one of the allowed days?
  if (task.days.length > 0 && !task.days.includes(currentDay)) {
    return { isAvailable: false, reason: "nicht fuer heute", timeStatus: null, limitRemaining: null }
  }

  // 3. Time check - Is current time within the time window?
  let timeStatus: "available" | "upcoming" | "overdue" | null = null
  if (task.startTime || task.endTime) {
    let startMinutes = 0
    let endMinutes = 24 * 60

    if (task.startTime) {
      const [h, m] = task.startTime.split(":").map(Number)
      startMinutes = h * 60 + m
    }

    if (task.endTime) {
      const [h, m] = task.endTime.split(":").map(Number)
      endMinutes = h * 60 + m
    }

    if (currentMinutes < startMinutes) {
      timeStatus = "upcoming"
    } else if (currentMinutes > endMinutes) {
      timeStatus = "overdue"
      return { isAvailable: false, reason: "Zeitfenster abgelaufen", timeStatus, limitRemaining: null }
    } else {
      timeStatus = "available"
    }
  }

  // 4. Limit check - Has the daily limit been reached?
  let limitRemaining: number | null = null
  if (task.dailyLimit && task.dailyLimit > 0) {
    const taskCompletionsToday = todayCompletions.filter((tc) => tc.taskId === task.id && tc.childId === childId).length
    limitRemaining = task.dailyLimit - taskCompletionsToday

    if (limitRemaining <= 0) {
      return { isAvailable: false, reason: "Tageslimit erreicht", timeStatus, limitRemaining: 0 }
    }
  }

  return { isAvailable: true, reason: null, timeStatus, limitRemaining }
}

export function TaskList({ category, childId, showHidden = false }: TaskListProps) {
  const { state, isTaskCompletedToday, todayCompletions } = useFamily()

  const tasks = state.tasks ?? []

  const { availableTasks, hiddenTasks } = useMemo(() => {
    const available: (Task & { availability: ReturnType<typeof checkTaskAvailability> })[] = []
    const hidden: (Task & { availability: ReturnType<typeof checkTaskAvailability> })[] = []

    for (const task of tasks) {
      // Category filter
      if (category !== "all" && task.category !== category) continue

      const availability = checkTaskAvailability(task, childId, todayCompletions)

      if (availability.isAvailable) {
        available.push({ ...task, availability })
      } else {
        hidden.push({ ...task, availability })
      }
    }

    return { availableTasks: available, hiddenTasks: hidden }
  }, [tasks, category, childId, todayCompletions])

  // Sort: incomplete first, then by order
  const sortedTasks = useMemo(() => {
    return [...availableTasks].sort((a, b) => {
      const aCompleted = isTaskCompletedToday(a.id, childId)
      const bCompleted = isTaskCompletedToday(b.id, childId)
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1

      // Sort upcoming tasks after available ones
      if (a.availability.timeStatus === "upcoming" && b.availability.timeStatus !== "upcoming") return 1
      if (b.availability.timeStatus === "upcoming" && a.availability.timeStatus !== "upcoming") return -1

      return a.order - b.order
    })
  }, [availableTasks, childId, isTaskCompletedToday])

  // Calculate completion stats
  const completedCount = sortedTasks.filter((t) => isTaskCompletedToday(t.id, childId)).length
  const totalCount = sortedTasks.length
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (sortedTasks.length === 0 && hiddenTasks.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="Keine Aufgaben"
        description={
          category === "all" ? "Heute stehen keine Aufgaben an." : "Fuer diese Kategorie gibt es heute keine Aufgaben."
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-muted-foreground">
          {completedCount} von {totalCount} erledigt
        </span>
        <span className="text-sm font-medium text-foreground">{completionPercent}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-success transition-all duration-500 rounded-full"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {/* Available Task Cards */}
      <div className="space-y-3">
        {sortedTasks.map((task) => (
          <TaskCard key={task.id} task={task} childId={childId} isCompleted={isTaskCompletedToday(task.id, childId)} />
        ))}
      </div>

      {/* Hidden Tasks Section (optional) */}
      {showHidden && hiddenTasks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Nicht verfuegbar ({hiddenTasks.length})</h4>
          <div className="space-y-2">
            {hiddenTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 opacity-60">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{task.emoji}</span>
                  <span className="text-sm text-muted-foreground">{task.title}</span>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {task.availability.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
