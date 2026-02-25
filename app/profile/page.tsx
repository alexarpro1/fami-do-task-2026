"use client"

import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { EmptyState } from "@/components/ui/empty-state"
import { ProgressRing } from "@/components/ui/progress-ring"
import { PointsDisplay } from "@/components/points/points-display"
import { Button } from "@/components/ui/button"
import { ChildAvatar } from "@/components/child/child-avatar"
import { StreakBadge } from "@/components/streak/streak-badge"
import { AchievementGrid } from "@/components/achievements/achievement-card"
import { WeeklySummary } from "@/components/stats/weekly-summary"
import { LevelBadge } from "@/components/level/level-badge"
import Link from "next/link"
import {
  Calendar,
  Trophy,
  Target,
  TrendingUp,
  CheckCircle,
  ShoppingBag,
  Scale,
  ChevronDown,
  ChevronUp,
  Coins,
  Flame,
  Medal,
} from "lucide-react"
import { useMemo, useState } from "react"

type ActivityType = "task" | "reward" | "rule" | "adjustment" | "game"

interface Activity {
  id: string
  type: ActivityType
  title: string
  emoji: string
  points: number
  isPositive: boolean
  timestamp: string
  note?: string
}

export default function ProfilePage() {
  const { selectedChild, state, getTodayCompletionsForChild } = useFamily()
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "achievements" | "history">("overview")

  const allActivities = useMemo(() => {
    if (!selectedChild) return []

    const activities: Activity[] = []

    // Task completions
    state.taskCompletions
      .filter((tc) => tc.childId === selectedChild.id)
      .forEach((tc) => {
        const task = state.tasks.find((t) => t.id === tc.taskId)
        if (task) {
          activities.push({
            id: tc.id,
            type: "task",
            title: task.title,
            emoji: task.emoji,
            points: tc.pointsEarned,
            isPositive: true,
            timestamp: tc.completedAt,
          })
        }
      })

    // Reward redemptions (Shop purchases)
    state.rewardRedemptions
      .filter((rr) => rr.childId === selectedChild.id)
      .forEach((rr) => {
        const reward = state.rewards.find((r) => r.id === rr.rewardId)
        if (reward) {
          activities.push({
            id: rr.id,
            type: "reward",
            title: reward.name,
            emoji: reward.emoji,
            points: rr.pointsSpent,
            isPositive: false,
            timestamp: rr.redeemedAt,
          })
        }
      })

    // Rule applications
    state.ruleApplications
      .filter((ra) => ra.childId === selectedChild.id)
      .forEach((ra) => {
        const rule = state.rules.find((r) => r.id === ra.ruleId)
        if (rule) {
          activities.push({
            id: ra.id,
            type: "rule",
            title: rule.title,
            emoji: rule.emoji,
            points: Math.abs(ra.pointsChanged),
            isPositive: ra.pointsChanged > 0,
            timestamp: ra.appliedAt,
            note: ra.note,
          })
        }
      })

    // Point adjustments (manuell oder aus Spielen)
    const pointAdjustments = state.pointAdjustments ?? []
    pointAdjustments
      .filter((pa) => pa.childId === selectedChild.id)
      .forEach((pa) => {
        activities.push({
          id: pa.id,
          type: pa.adjustedBy === "game" ? "game" : "adjustment",
          title: pa.reason || (pa.amount > 0 ? "Punkte hinzugefügt" : "Punkte abgezogen"),
          emoji: pa.amount > 0 ? "🎮" : "➖",
          points: Math.abs(pa.amount),
          isPositive: pa.amount > 0,
          timestamp: pa.adjustedAt,
          note: pa.adjustedBy === "game" ? undefined : `Manuell von ${pa.adjustedBy}`,
        })
      })

    // Sort by timestamp descending (newest first)
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [
    selectedChild,
    state.taskCompletions,
    state.rewardRedemptions,
    state.ruleApplications,
    state.pointAdjustments,
    state.tasks,
    state.rewards,
    state.rules,
  ])

  if (!selectedChild) {
    return (
      <AppShell>
        <EmptyState
          icon="👤"
          title="Kein Kind ausgewaehlt"
          description="Waehle zuerst ein Kind aus."
          action={
            <Link href="/">
              <Button>Zur Startseite</Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  // Calculate stats
  const todayCompletions = getTodayCompletionsForChild(selectedChild.id)
  const todayPoints = todayCompletions.reduce((sum, tc) => sum + tc.pointsEarned, 0)

  // Get all completions for this child
  const allCompletions = state.taskCompletions.filter((tc) => tc.childId === selectedChild.id)

  // Weekly completions (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weeklyCompletions = allCompletions.filter((tc) => new Date(tc.completedAt) >= weekAgo)
  const weeklyPoints = weeklyCompletions.reduce((sum, tc) => sum + tc.pointsEarned, 0)

  // Calculate today's progress
  const todayDayIndex = new Date().getDay()
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  const currentDay = dayMap[todayDayIndex]
  const todayTasks = state.tasks.filter(
    (t) => t.isActive && (t.days.length === 0 || t.days.includes(currentDay)),
  ).length
  const todayProgress = todayTasks > 0 ? Math.round((todayCompletions.length / todayTasks) * 100) : 0

  // Redemptions
  const redemptions = state.rewardRedemptions.filter((rr) => rr.childId === selectedChild.id)
  const totalSpent = redemptions.reduce((sum, rr) => sum + rr.pointsSpent, 0)

  const displayedActivities = showAllActivities ? allActivities : allActivities.slice(0, 5)

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "task":
        return <CheckCircle className="w-4 h-4 text-success" />
      case "reward":
        return <ShoppingBag className="w-4 h-4 text-primary" />
      case "rule":
        return <Scale className="w-4 h-4 text-warning" />
      case "adjustment":
        return <Coins className="w-4 h-4 text-amber-500" />
      case "game":
        return <Trophy className="w-4 h-4 text-amber-500" />
    }
  }

  const getActivityLabel = (type: ActivityType) => {
    switch (type) {
      case "task":
        return "Aufgabe"
      case "reward":
        return "Shop"
      case "rule":
        return "Regel"
      case "adjustment":
        return "Anpassung"
      case "game":
        return "Spiel"
    }
  }

  const unlockedAchievements = selectedChild.achievements ?? []

  return (
    <AppShell>
      <div className="px-4 py-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-6">
          <ChildAvatar avatar={selectedChild.avatar} color={selectedChild.color} size="xl" showRing />
          <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground mt-4">{selectedChild.name}</h1>
          {selectedChild.age > 0 && <p className="text-muted-foreground">{selectedChild.age} Jahre</p>}

          {/* Points Display */}
          <div className="flex items-center gap-2 mt-4 px-6 py-3 bg-points/20 rounded-full">
            <PointsDisplay points={selectedChild.points} size="lg" />
          </div>

          {/* Streak Badge */}
          <div className="mt-3">
            <StreakBadge
              currentStreak={selectedChild.currentStreak ?? 0}
              longestStreak={selectedChild.longestStreak ?? 0}
              size="md"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("overview")}
            className="flex-shrink-0"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Uebersicht
          </Button>
          <Button
            variant={activeTab === "achievements" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("achievements")}
            className="flex-shrink-0"
          >
            <Medal className="w-4 h-4 mr-1" />
            Abzeichen ({unlockedAchievements.length})
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("history")}
            className="flex-shrink-0"
          >
            <Calendar className="w-4 h-4 mr-1" />
            Verlauf
          </Button>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Level Badge */}
            <div className="bg-card rounded-2xl p-4 neu-flat mb-6">
              <LevelBadge totalPointsEarned={selectedChild.totalPointsEarned} size="md" />
            </div>

            {/* Today's Progress */}
            <div className="flex items-center justify-center mb-6">
              <ProgressRing progress={todayProgress} size={140} strokeWidth={10} color={selectedChild.color}>
                <div className="text-center">
                  <p className="font-[var(--font-fredoka)] text-3xl font-bold text-foreground">{todayProgress}%</p>
                  <p className="text-xs text-muted-foreground">Heute</p>
                </div>
              </ProgressRing>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatCard icon={Calendar} label="Heute verdient" value={`+${todayPoints}`} color="#22c55e" />
              <StatCard icon={TrendingUp} label="Diese Woche" value={`+${weeklyPoints}`} color="#4ECDC4" />
              <StatCard icon={Trophy} label="Gesamt verdient" value={selectedChild.totalPointsEarned} color="#FFD700" />
              <StatCard icon={Target} label="Eingeloest" value={totalSpent} color="#FF6B9D" />
            </div>

            {/* Weekly Summary */}
            <WeeklySummary childId={selectedChild.id} />
          </>
        )}

        {activeTab === "achievements" && (
          <div className="space-y-6">
            {/* Unlocked Count */}
            <div className="bg-card rounded-2xl p-4 neu-flat text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Medal className="w-6 h-6 text-amber-500" />
                <span className="text-2xl font-bold text-foreground">{unlockedAchievements.length}</span>
                <span className="text-muted-foreground">/ 20</span>
              </div>
              <p className="text-sm text-muted-foreground">Abzeichen freigeschaltet</p>
            </div>

            {/* Achievement Categories */}
            <div className="space-y-4">
              <div className="bg-card rounded-2xl p-4 neu-flat">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Streak-Abzeichen
                </h3>
                <AchievementGrid unlockedAchievements={unlockedAchievements} category="streak" />
              </div>

              <div className="bg-card rounded-2xl p-4 neu-flat">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-500" />
                  Aufgaben-Abzeichen
                </h3>
                <AchievementGrid unlockedAchievements={unlockedAchievements} category="tasks" />
              </div>

              <div className="bg-card rounded-2xl p-4 neu-flat">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Punkte-Abzeichen
                </h3>
                <AchievementGrid unlockedAchievements={unlockedAchievements} category="points" />
              </div>

              <div className="bg-card rounded-2xl p-4 neu-flat">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-pink-500" />
                  Shop-Abzeichen
                </h3>
                <AchievementGrid unlockedAchievements={unlockedAchievements} category="shop" />
              </div>

              <div className="bg-card rounded-2xl p-4 neu-flat">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  Spezial-Abzeichen
                </h3>
                <AchievementGrid unlockedAchievements={unlockedAchievements} category="special" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-foreground">Letzte Aktivitaeten</h2>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                {allActivities.length} gesamt
              </span>
            </div>

            <div className="space-y-3">
              {displayedActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-card rounded-xl neu-flat">
                  <div className="relative">
                    <span className="text-xl">{activity.emoji}</span>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{activity.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {getActivityLabel(activity.type)}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString("de-DE", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {activity.note && (
                      <p className="text-xs text-muted-foreground italic mt-1 truncate">"{activity.note}"</p>
                    )}
                  </div>
                  <span
                    className={`text-sm font-bold whitespace-nowrap ${activity.isPositive ? "text-success" : "text-destructive"}`}
                  >
                    {activity.isPositive ? "+" : "-"}
                    {activity.points}
                  </span>
                </div>
              ))}

              {allActivities.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Noch keine Aktivitaeten</p>
              )}
            </div>

            {allActivities.length > 5 && (
              <Button variant="ghost" className="w-full mt-3" onClick={() => setShowAllActivities(!showAllActivities)}>
                {showAllActivities ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Weniger anzeigen
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Alle {allActivities.length} Aktivitaeten anzeigen
                  </>
                )}
              </Button>
            )}
          </section>
        )}
      </div>
    </AppShell>
  )
}

import type { LucideIcon } from "lucide-react"

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-xl neu-flat">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="font-[var(--font-fredoka)] text-lg font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
