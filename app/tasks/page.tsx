"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { useTodayPointsForChild } from "@/hooks/useCompletions"
import { TaskList } from "@/components/task/task-list"
import { CategoryTabs } from "@/components/task/category-tabs"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { TaskCategory } from "@/types"
import { DAYS } from "@/lib/constants"

export default function TasksPage() {
  const { selectedChild } = useFamily()
  const { pointsToday: totalPointsToday, countToday: todayCompletionsCount, isLoading: todayLoading } = useTodayPointsForChild(selectedChild?.id ?? null)
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | "all">("all")

  if (!selectedChild) {
    return (
      <AppShell>
        <EmptyState
          icon="👤"
          title="Kein Kind ausgewählt"
          description="Wähle zuerst ein Kind aus."
          action={
            <Link href="/">
              <Button>Zur Startseite</Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  const today = new Date()
  const dayIndex = today.getDay()
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  const currentDay = dayMap[dayIndex]
  const dayLabel = DAYS.find((d) => d.key === currentDay)?.full || "Heute"

  return (
    <AppShell>
      <div className="px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground">Aufgaben</h1>
          <p className="text-muted-foreground">{dayLabel}</p>
        </div>

        {/* Today's Summary */}
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl neu-flat mb-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: selectedChild.color + "20" }}
          >
            {selectedChild.avatar}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{selectedChild.name}</p>
            <p className="text-sm text-muted-foreground">
              Heute: +{todayLoading ? "…" : totalPointsToday} Punkte verdient
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{todayLoading ? "…" : todayCompletionsCount}</p>
            <p className="text-xs text-muted-foreground">Aufgaben erledigt</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6">
          <CategoryTabs selected={selectedCategory} onChange={setSelectedCategory} />
        </div>

        {/* Task List */}
        <TaskList category={selectedCategory} childId={selectedChild.id} />
      </div>
    </AppShell>
  )
}
