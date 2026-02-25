"use client"

import { AppShell } from "@/components/layout/app-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { useFamily } from "@/context/family-context"
import { useSelectedChild } from "@/hooks/useChildren"
import { useTasks } from "@/hooks/useTasks"
import { useRewards } from "@/hooks/useRewards"
import { mapTaskRecordToTask } from "@/lib/db/mapTaskRecordToTask"
import { useChildPoints, useTodayPointsForChild, useTodayCompletionsForChild } from "@/hooks/useCompletions"
import { useRewards } from "@/hooks/useRewards"
import { useRules } from "@/hooks/useRules"
import { Button } from "@/components/ui/button"
import { WeatherWidget } from "@/components/weather/weather-widget"
import { MoodSelector } from "@/components/mood/mood-selector"
import { PointsPopup } from "@/components/effects/points-popup"
import { ConfettiEffect } from "@/components/effects/confetti-effect"
import { LevelBadge } from "@/components/level/level-badge"
import { StreakBadge } from "@/components/streak/streak-badge"
import Link from "next/link"
import type { RuleProfile } from "@/hooks/useRules"
import { CheckCircle, Circle, Heart, ShoppingCart, Star } from "lucide-react"
import { useState, useRef } from "react"
import { ChildCard } from "@/components/dashboard/child-card"

export default function HomePage() {
  const { state, dispatch } = useFamily()
  const { children, selectedChild } = useSelectedChild()
  const { points: childPoints } = useChildPoints(selectedChild?.id ?? null)
  const { countToday: todayCompletionsCount } = useTodayPointsForChild(selectedChild?.id ?? null)
  const { completedTaskIds } = useTodayCompletionsForChild(selectedChild?.id ?? null)
  const { tasks: taskRecords } = useTasks()
  const { rewards, redeemReward } = useRewards()
  const { rules: rulesFromSync, applyRule } = useRules()
  const currentDay = (() => {
    const d = new Date()
    return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()]
  })()
  const todaysTasks = taskRecords
    .map(mapTaskRecordToTask)
    .filter((task) => task.isActive && task.days.includes(currentDay))
    .slice(0, 4)
  const [showPointsPopup, setShowPointsPopup] = useState(false)
  const [pointsChange, setPointsChange] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiKey, setConfettiKey] = useState(0)
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!children.length) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <EmptyState
            icon="👨‍👩‍👧‍👦"
            title="Willkommen bei FamiApp!"
            description="Erstelle zuerst ein Kind-Profil, um loszulegen."
            action={
              <Link href="/admin">
                <Button size="lg" className="rounded-full px-8">
                  Kind hinzufuegen
                </Button>
              </Link>
            }
          />
        </div>
      </AppShell>
    )
  }

  // If children exist but none selected, show child selector
  if (!selectedChild) {
    return (
      <AppShell>
        <div className="flex flex-col items-center px-4 py-8">
          <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground mb-2 text-center">
            Wer bist du heute?
          </h1>
          <p className="text-muted-foreground mb-8 text-center">Waehle dein Profil aus</p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {children.map((child) => (
              <ChildCard key={child.id} child={child} />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  // Get pet for selected child
  const pet = (state.pets || []).find((p) => p.childId === selectedChild.id)

  const todayCompletionsCountDisplay = todayCompletionsCount

  const favoriteRuleIds = state.settings.favoriteRuleIds ?? []
  const favoriteRules: RuleProfile[] = favoriteRuleIds
    .map((id) => rulesFromSync.find((r) => r.id === id))
    .filter((r): r is RuleProfile => !!r && r.is_active === 1)

  const scheduleConfettiOff = () => {
    if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current)
    confettiTimeoutRef.current = setTimeout(() => setShowConfetti(false), 3000)
  }

  const handleRuleApplied = async (rule: RuleProfile) => {
    await applyRule(rule.id, selectedChild!.id, rule.point_impact)
    setPointsChange(rule.point_impact)
    setShowPointsPopup(true)
    if (rule.point_impact > 0 && state.settings.showConfetti) {
      setConfettiKey((k) => k + 1)
      setShowConfetti(true)
      scheduleConfettiOff()
    }
    setTimeout(() => setShowPointsPopup(false), 2000)
  }

  const handleRedeemReward = async (rewardId: string, cost: number) => {
    if (!selectedChild || childPoints < cost) return
    await redeemReward(rewardId, selectedChild.id, cost)
    setPointsChange(-cost)
    setShowPointsPopup(true)
    if (state.settings.showConfetti) {
      setShowConfetti(true)
      scheduleConfettiOff()
    }
    setTimeout(() => setShowPointsPopup(false), 2000)
  }

  // Belohnungen von PowerSync für Dashboard (z. B. erste 3)
  const dashboardRewards = rewards.slice(0, 3)

  // Child is selected - show dashboard
  return (
    <AppShell>
      <div className="flex flex-col px-4 py-6 gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl neu-flat"
            style={{ backgroundColor: selectedChild.color + "20" }}
          >
            {selectedChild.avatar}
          </div>
          <div className="flex-1">
            <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground">
              Hallo, {selectedChild.name}!
            </h1>
            <p className="text-muted-foreground text-sm">Was moechtest du heute erledigen?</p>
          </div>
            <div className="flex flex-col gap-1 items-end">
            <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full">
              <span className="text-sm">⭐</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{childPoints}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-teal-500/10 px-2.5 py-1 rounded-full">
              <span className="text-sm">✅</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">{todayCompletionsCountDisplay}</span>
            </div>
          </div>
        </div>

        {/* Streak and Level Row – Streak vorerst Platzhalter bis PowerSync-Logik */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-3 neu-flat">
            <StreakBadge currentStreak={0} longestStreak={0} size="sm" />
          </div>
          <Link href="/profile" className="bg-card rounded-2xl p-3 neu-flat hover:scale-[1.02] transition-transform">
            <LevelBadge totalPointsEarned={childPoints} size="sm" />
          </Link>
        </div>

        {dashboardRewards.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                Belohnungen
              </h3>
              <Link href="/rewards" className="text-sm text-primary font-medium">
                Zum Shop
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {dashboardRewards.map((reward) => {
                const canAfford = childPoints >= reward.cost
                return (
                  <div
                    key={reward.id}
                    className="flex items-center gap-3 p-3 bg-card rounded-2xl neu-flat"
                  >
                    <div className="text-2xl">{reward.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{reward.title}</p>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-amber-600">{reward.cost}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full shrink-0"
                      disabled={!canAfford}
                      onClick={() => handleRedeemReward(reward.id, reward.cost)}
                    >
                      {canAfford ? (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          Einlösen
                        </>
                      ) : (
                        "Zu wenig Punkte"
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {state.settings.weatherEnabled && <WeatherWidget />}

        {state.settings.moodTrackingEnabled && (
          <div className="bg-card rounded-2xl p-4 neu-flat">
            <h3 className="font-semibold text-foreground mb-3">Wie geht es dir heute?</h3>
            <MoodSelector childId={selectedChild.id} compact />
          </div>
        )}

        {favoriteRules.length > 0 && (
          <div className="bg-card rounded-2xl p-4 neu-flat">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Schnell-Regeln</h3>
              <Link href="/rules" className="text-sm text-primary font-medium">
                Alle anzeigen
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {favoriteRules.slice(0, 8).map((rule) => (
                <QuickRuleButton
                  key={rule.id}
                  rule={{ id: rule.id, title: rule.title, point_impact: rule.point_impact, emoji: rule.emoji }}
                  onApply={() => handleRuleApplied(rule)}
                />
              ))}
            </div>
          </div>
        )}

        {todaysTasks.length > 0 && (
          <div className="bg-card rounded-2xl p-4 neu-flat">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Heutige Aufgaben</h3>
              <Link href="/tasks" className="text-sm text-primary font-medium">
                Alle anzeigen
              </Link>
            </div>
            <div className="space-y-2">
              {todaysTasks.map((task) => {
                const completed = completedTaskIds.has(task.id)
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                      completed ? "bg-success/10" : "bg-secondary/50"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-xl">{task.emoji}</span>
                    <span className={`flex-1 ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </span>
                    <span className="text-sm font-medium text-primary">+{task.points}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {state.settings.petSystemEnabled && pet && (
          <Link href="/pet" className="block">
            <div className="bg-card rounded-2xl p-4 neu-flat flex items-center gap-4 hover:scale-[1.02] transition-transform">
              <div className="text-4xl">{getPetEmoji(pet.type, pet.evolutionStage)}</div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{pet.name}</p>
                <p className="text-sm text-muted-foreground">
                  Level {pet.level} - {pet.mood === "happy" ? "Gluecklich" : pet.mood === "sad" ? "Traurig" : "Normal"}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <span className="text-sm">❤️</span>
                  <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${pet.health}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Effects */}
        {showPointsPopup && <PointsPopup points={pointsChange} />}
        {showConfetti && <ConfettiEffect key={confettiKey} />}
      </div>
    </AppShell>
  )
}

function QuickRuleButton({
  rule,
  onApply,
}: {
  rule: { id: string; title: string; point_impact: number; emoji: string }
  onApply: () => void
}) {
  const [showLocalPopup, setShowLocalPopup] = useState(false)
  const [isApplied, setIsApplied] = useState(false)
  const isPositive = rule.point_impact >= 0

  const handleClick = () => {
    if (isApplied) return
    onApply()
    setShowLocalPopup(true)
    setIsApplied(true)
    setTimeout(() => {
      setShowLocalPopup(false)
      setIsApplied(false)
    }, 800)
  }

  return (
    <button
      onClick={handleClick}
      disabled={isApplied}
      className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
        isApplied ? "scale-95" : "hover:scale-105"
      } ${isPositive ? "bg-green-500/10 hover:bg-green-500/20" : "bg-red-500/10 hover:bg-red-500/20"}`}
    >
      {showLocalPopup && (
        <div
          className={`absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-1 rounded-full text-sm font-bold animate-bounce ${
            isPositive ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {isPositive ? "+" : ""}
          {rule.point_impact}
        </div>
      )}

      <span className={`text-2xl mb-1 transition-transform ${isApplied ? "scale-125" : ""}`}>{rule.emoji}</span>
      <span className="text-xs font-medium text-foreground text-center line-clamp-1">
        {isApplied ? "Angewendet!" : rule.title}
      </span>
      <span className={`text-xs font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
        {isPositive ? "+" : ""}
        {rule.point_impact}
      </span>
    </button>
  )
}

function getPetEmoji(type: string, stage: number): string {
  const petEmojis: Record<string, string[]> = {
    cat: ["🐱", "😺", "😸", "🐈", "🦁"],
    dog: ["🐶", "🐕", "🦮", "🐕‍🦺", "🐺"],
    bunny: ["🐰", "🐇", "🐾", "🦊", "🐻"],
    dragon: ["🐲", "🐉", "🔥", "⚡", "🌟"],
    unicorn: ["🦄", "🌈", "✨", "💫", "🌟"],
  }
  return petEmojis[type]?.[Math.min(stage - 1, 4)] || "🐾"
}
