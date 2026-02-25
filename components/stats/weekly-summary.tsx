"use client"

import { useFamily } from "@/context/family-context"
import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, CheckCircle, Star, ShoppingBag, Scale } from "lucide-react"

interface WeeklySummaryProps {
  childId: string
}

export function WeeklySummary({ childId }: WeeklySummaryProps) {
  const { state } = useFamily()

  // Get data for this week
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0)

  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  // This week stats
  const thisWeekTasks = state.taskCompletions.filter(
    (tc) => tc.childId === childId && new Date(tc.completedAt) >= weekStart,
  )
  const thisWeekPoints = thisWeekTasks.reduce((sum, tc) => sum + tc.pointsEarned, 0)

  const thisWeekRewards = state.rewardRedemptions.filter(
    (r) => r.childId === childId && new Date(r.redeemedAt) >= weekStart,
  )
  const thisWeekSpent = thisWeekRewards.reduce((sum, r) => sum + r.pointsSpent, 0)

  const thisWeekRules = state.ruleApplications.filter(
    (r) => r.childId === childId && new Date(r.appliedAt) >= weekStart,
  )
  const thisWeekRulePoints = thisWeekRules.reduce((sum, r) => sum + r.pointsChanged, 0)

  // Last week stats for comparison
  const lastWeekTasks = state.taskCompletions.filter(
    (tc) => tc.childId === childId && new Date(tc.completedAt) >= lastWeekStart && new Date(tc.completedAt) < weekStart,
  )
  const lastWeekPoints = lastWeekTasks.reduce((sum, tc) => sum + tc.pointsEarned, 0)

  // Trend calculation
  const taskTrend = thisWeekTasks.length - lastWeekTasks.length
  const pointsTrend = thisWeekPoints - lastWeekPoints

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-muted-foreground" />
  }

  const getTrendText = (trend: number) => {
    if (trend > 0) return `+${trend}`
    if (trend < 0) return `${trend}`
    return "0"
  }

  // Daily breakdown
  const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
  const dailyTasks = days.map((_, i) => {
    const dayStart = new Date(weekStart)
    dayStart.setDate(weekStart.getDate() + i)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    return state.taskCompletions.filter(
      (tc) => tc.childId === childId && new Date(tc.completedAt) >= dayStart && new Date(tc.completedAt) < dayEnd,
    ).length
  })

  const maxDaily = Math.max(...dailyTasks, 1)

  return (
    <Card className="p-4 neu-flat space-y-4">
      <h3 className="font-semibold text-foreground">Diese Woche</h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-teal-500" />
            <span className="text-sm text-muted-foreground">Aufgaben</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{thisWeekTasks.length}</span>
            <div className="flex items-center gap-1 text-xs">
              {getTrendIcon(taskTrend)}
              <span
                className={taskTrend > 0 ? "text-green-500" : taskTrend < 0 ? "text-red-500" : "text-muted-foreground"}
              >
                {getTrendText(taskTrend)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">Verdient</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{thisWeekPoints}</span>
            <div className="flex items-center gap-1 text-xs">
              {getTrendIcon(pointsTrend)}
              <span
                className={
                  pointsTrend > 0 ? "text-green-500" : pointsTrend < 0 ? "text-red-500" : "text-muted-foreground"
                }
              >
                {getTrendText(pointsTrend)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-muted-foreground">Ausgegeben</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{thisWeekSpent}</span>
        </div>

        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Regeln</span>
          </div>
          <span className={`text-2xl font-bold ${thisWeekRulePoints >= 0 ? "text-green-500" : "text-red-500"}`}>
            {thisWeekRulePoints >= 0 ? "+" : ""}
            {thisWeekRulePoints}
          </span>
        </div>
      </div>

      {/* Daily Chart */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Aufgaben pro Tag</p>
        <div className="flex items-end gap-1 h-16">
          {dailyTasks.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary/20 rounded-t transition-all"
                style={{
                  height: `${(count / maxDaily) * 100}%`,
                  minHeight: count > 0 ? "8px" : "2px",
                  backgroundColor: i === now.getDay() ? "var(--primary)" : undefined,
                  opacity: i === now.getDay() ? 1 : 0.5,
                }}
              />
              <span className={`text-xs ${i === now.getDay() ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {days[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
