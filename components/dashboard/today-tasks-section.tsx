"use client"

import Link from "next/link"
import { CheckCircle, Circle } from "lucide-react"
import type { Task } from "@/types"
import { cn } from "@/lib/utils"

export interface TodayTasksSectionProps {
  tasks: Task[]
  childId: string
  isTaskCompletedToday: (taskId: string, childId: string) => boolean
}

/** Modulare Karte „Heutige Aufgaben“ für die Startseite. */
export function TodayTasksSection({ tasks, childId, isTaskCompletedToday }: TodayTasksSectionProps) {
  if (tasks.length === 0) return null

  return (
    <section className="bg-card rounded-2xl p-4 neu-flat">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Heutige Aufgaben</h3>
        <Link href="/tasks" className="text-sm text-primary font-medium">
          Alle anzeigen
        </Link>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => {
          const completed = isTaskCompletedToday(task.id, childId)
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-all",
                completed ? "bg-success/10" : "bg-secondary/50",
              )}
            >
              {completed ? (
                <CheckCircle className="w-5 h-5 text-success shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className="text-xl shrink-0">{task.emoji}</span>
              <span
                className={cn(
                  "flex-1 min-w-0",
                  completed ? "line-through text-muted-foreground" : "text-foreground",
                )}
              >
                {task.title}
              </span>
              <span className="text-sm font-medium text-primary shrink-0">+{task.points}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
