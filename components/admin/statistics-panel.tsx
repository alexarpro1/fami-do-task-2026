"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { useFamily } from "@/context/family-context"
import { ChildAvatar } from "@/components/child/child-avatar"
import { TrendingUp, TrendingDown, Award, CheckCircle } from "lucide-react"

export function StatisticsPanel() {
  const { state } = useFamily()
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    (state.children || []).length > 0 ? (state.children || [])[0].id : null,
  )

  const selectedChild = (state.children || []).find((c) => c.id === selectedChildId)

  // Generate last 7 days data
  const weekData = useMemo(() => {
    const days = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      // Count completed tasks for this day
      const completedCount = selectedChild?.completedTasks?.filter((ct) => ct.date === dateStr).length || 0

      days.push({
        date: dateStr,
        label: date.toLocaleDateString("de-DE", { weekday: "short" }),
        fullLabel: date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "short" }),
        count: completedCount,
        isToday: i === 0,
      })
    }
    return days
  }, [selectedChild])

  const maxCount = Math.max(...weekData.map((d) => d.count), 5)

  const stats = useMemo(() => {
    if (!selectedChild) return null

    const totalCompleted = selectedChild.completedTasks?.length || 0
    const totalTasks = (state.tasks || []).filter((t) => t?.isActive).length
    const weekTotal = weekData.reduce((sum, d) => sum + d.count, 0)
    const avgPerDay = weekTotal / 7

    return {
      totalPoints: selectedChild.points || 0,
      totalEarned: selectedChild.totalEarned || 0,
      totalCompleted,
      weekTotal,
      avgPerDay: avgPerDay.toFixed(1),
      streak: calculateStreak(weekData),
    }
  }, [selectedChild, weekData, state.tasks])

  return (
    <div className="space-y-6">
      {/* Child Selector */}
      {(state.children || []).length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(state.children || []).map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all
                ${
                  selectedChildId === child.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
            >
              <ChildAvatar avatar={child.avatar} color={child.color} size="sm" showBorder={false} />
              <span className="font-medium">{child.name}</span>
            </button>
          ))}
        </div>
      )}

      {selectedChild && stats ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Award className="w-5 h-5 text-primary" />}
              label="Aktuelle Punkte"
              value={stats.totalPoints.toString()}
              color="primary"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
              label="Gesamt verdient"
              value={stats.totalEarned.toString()}
              color="green"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5 text-blue-500" />}
              label="Diese Woche"
              value={stats.weekTotal.toString()}
              subtitle={`${stats.avgPerDay}/Tag`}
              color="blue"
            />
            <StatCard
              icon={
                stats.streak > 0 ? (
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-muted-foreground" />
                )
              }
              label="Streak"
              value={`${stats.streak} Tage`}
              color={stats.streak > 0 ? "orange" : "gray"}
            />
          </div>

          {/* Week Chart */}
          <div className="bg-card rounded-2xl p-4 neu-flat">
            <h3 className="font-semibold text-foreground mb-4">Letzte 7 Tage</h3>
            <div className="flex items-end justify-between gap-2 h-40">
              {weekData.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full flex-1 flex items-end justify-center">
                    <div
                      className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500
                        ${day.isToday ? "bg-primary" : "bg-primary/40"}`}
                      style={{
                        height: `${Math.max((day.count / maxCount) * 100, 8)}%`,
                      }}
                    />
                    {day.count > 0 && (
                      <span className="absolute -top-6 text-xs font-medium text-foreground">{day.count}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium
                    ${day.isToday ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-2xl p-4 neu-flat">
            <h3 className="font-semibold text-foreground mb-4">Letzte Aktivitaeten</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(selectedChild.completedTasks || [])
                .slice(-10)
                .reverse()
                .map((ct, idx) => {
                  const task = (state.tasks || []).find((t) => t?.id === ct?.taskId)
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{task?.emoji || "?"}</span>
                        <span className="text-sm text-foreground">{task?.title || "Unbekannte Aufgabe"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {new Date(ct.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              {(!selectedChild.completedTasks || selectedChild.completedTasks.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Noch keine Aktivitaeten</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Keine Kinder vorhanden. Fuege zuerst ein Kind hinzu.
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  color: string
}) {
  return (
    <div className="bg-card rounded-xl p-4 neu-flat">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}

function calculateStreak(weekData: { count: number }[]): number {
  let streak = 0
  // Start from today and go backwards
  for (let i = weekData.length - 1; i >= 0; i--) {
    if (weekData[i].count > 0) {
      streak++
    } else {
      break
    }
  }
  return streak
}
