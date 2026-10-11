"use client"

import { AppShell } from "@/components/layout/app-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import { Button } from "@/components/ui/button"
import { WeatherWidget } from "@/components/weather/weather-widget"
import { MoodSelector } from "@/components/mood/mood-selector"
import { PointsPopup } from "@/components/effects/points-popup"
import { ConfettiEffect } from "@/components/effects/confetti-effect"
import { LevelBadge } from "@/components/level/level-badge"
import { WishlistCard } from "@/components/wishlist/wishlist-card"
import { StreakBadge } from "@/components/streak/streak-badge"
import Link from "next/link"
import type { Rule, Reward } from "@/types"
import { Heart } from "lucide-react"
import { useState, useRef } from "react"
import { ChildCard } from "@/components/dashboard/child-card"
import { QuickRulesSection } from "@/components/dashboard/quick-rules-section"
import { TodayTasksSection } from "@/components/dashboard/today-tasks-section"
import { PendingApprovalsWidget } from "@/components/admin/PendingApprovalsWidget"
import { useDeviceRole } from "@/hooks/useDeviceRole"

export default function HomePage() {
  const { selectedChild, state, isTaskCompletedToday, getTodayCompletionsForChild, dispatch } = useFamily()
  const [deviceRole] = useDeviceRole()
  const { applyRule, redeemReward } = useSupabaseMutations()
  const [showPointsPopup, setShowPointsPopup] = useState(false)
  const [pointsChange, setPointsChange] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiKey, setConfettiKey] = useState(0)
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!state.children || state.children.length === 0) {
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
                  Kind hinzufügen
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
          <p className="text-muted-foreground mb-8 text-center">Wähle dein Profil aus</p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {(state.children || []).map((child) => (
              <ChildCard key={child.id} child={child} />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  // Get pet for selected child
  const pet = (state.pets || []).find((p) => p.childId === selectedChild.id)

  const today = new Date()
  const dayIndex = today.getDay()
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  const currentDay = dayMap[dayIndex]

  const todaysTasks = (state.tasks || []).filter((task) => task.isActive && task.days.includes(currentDay)).slice(0, 4)

  const todayCompletions = getTodayCompletionsForChild(selectedChild.id)

  const favoriteRules = (state.settings.favoriteRuleIds ?? [])
    .map((id) => (state.rules || []).find((r) => r.id === id))
    .filter((r) => r && r.isActive) as Rule[]

  const wishlistRewards = (selectedChild.wishlistRewardIds ?? [])
    .map((id) => (state.rewards || []).find((r) => r.id === id))
    .filter((r): r is Reward => r !== undefined && r.isActive)

  const scheduleConfettiOff = () => {
    if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current)
    confettiTimeoutRef.current = setTimeout(() => setShowConfetti(false), 3000)
  }

  const handleRuleApplied = (rule: Rule) => {
    void applyRule(rule.id, selectedChild!.id, rule.points)

    setPointsChange(rule.points)
    setShowPointsPopup(true)

    if (rule.isPositive) {
      if (state.settings.showConfetti) {
        setConfettiKey((k) => k + 1)
        setShowConfetti(true)
        scheduleConfettiOff()
      }
    }

    setTimeout(() => setShowPointsPopup(false), 2000)
  }

  const handleWishlistPurchase = (rewardId: string) => {
    const reward = (state.rewards || []).find((r) => r.id === rewardId)
    if (!reward || selectedChild.points < reward.cost) return

    void redeemReward(rewardId, selectedChild.id, reward.cost)

    dispatch({
      type: "REMOVE_FROM_WISHLIST",
      payload: { childId: selectedChild.id, rewardId },
    })

    setPointsChange(-reward.cost)
    setShowPointsPopup(true)
    if (state.settings.showConfetti) {
      setShowConfetti(true)
      scheduleConfettiOff()
    }
    setTimeout(() => setShowPointsPopup(false), 2000)
  }

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
              <span className="font-bold text-amber-600 dark:text-amber-400">{selectedChild.points}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-teal-500/10 px-2.5 py-1 rounded-full">
              <span className="text-sm">✅</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">{todayCompletions.length}</span>
            </div>
          </div>
        </div>

        {/* Phase 18: Offene Freigaben nur für Eltern/Master */}
        {(deviceRole === "parent" || deviceRole === "master") && (
          <PendingApprovalsWidget />
        )}

        {/* Streak and Level Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-3 neu-flat">
            <StreakBadge
              currentStreak={selectedChild.currentStreak ?? 0}
              longestStreak={selectedChild.longestStreak ?? 0}
              size="sm"
            />
          </div>
          <Link href="/profile" className="bg-card rounded-2xl p-3 neu-flat hover:scale-[1.02] transition-transform">
            <LevelBadge totalPointsEarned={selectedChild.totalPointsEarned} size="sm" />
          </Link>
        </div>

        {wishlistRewards.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                Meine Wunschliste
              </h3>
              <Link href="/rewards" className="text-sm text-primary font-medium">
                Zum Shop
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {wishlistRewards.map((reward) => (
                <WishlistCard
                  key={reward.id}
                  reward={reward}
                  childId={selectedChild.id}
                  currentPoints={selectedChild.points}
                  onPurchase={() => handleWishlistPurchase(reward.id)}
                />
              ))}
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

        <QuickRulesSection
          rules={favoriteRules}
          childId={selectedChild.id}
          todayApplicationCount={(ruleId) =>
            (state.ruleApplications || []).filter(
              (app) =>
                app.ruleId === ruleId &&
                app.childId === selectedChild.id &&
                app.appliedAt.startsWith(new Date().toISOString().split("T")[0]),
            ).length
          }
          onRuleApply={handleRuleApplied}
        />

        <TodayTasksSection
          tasks={todaysTasks}
          childId={selectedChild.id}
          isTaskCompletedToday={isTaskCompletedToday}
        />

        {state.settings.petSystemEnabled && pet && (
          <Link href="/pet" className="block">
            <div className="bg-card rounded-2xl p-4 neu-flat flex items-center gap-4 hover:scale-[1.02] transition-transform">
              <div className="text-4xl">{getPetEmoji(pet.type, pet.evolutionStage)}</div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{pet.name}</p>
                <p className="text-sm text-muted-foreground">
                  Level {pet.level} - {pet.mood === "happy" ? "Glücklich" : pet.mood === "sad" ? "Traurig" : "Normal"}
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
        {showPointsPopup && <PointsPopup points={pointsChange} show={true} />}
        {showConfetti && <ConfettiEffect key={confettiKey} />}
      </div>
    </AppShell>
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
