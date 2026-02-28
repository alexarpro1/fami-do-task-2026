"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { PointsDisplay } from "@/components/points/points-display"
import { CelebrationOverlay } from "@/components/effects/celebration-overlay"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Star, ThumbsUp, ThumbsDown, Check, ArrowUpDown, ArrowUp, ArrowDown, Clock } from "lucide-react"

type SortMode = "default" | "points-asc" | "points-desc"

export default function RulesPage() {
  const { state, selectedChild, dispatch, getTodayRuleApplications } = useFamily()
  const [celebration, setCelebration] = useState<{ active: boolean; points: number; message: string }>({
    active: false,
    points: 0,
    message: "",
  })
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>("default")

  const cycleSortMode = () => {
    setSortMode((prev) => {
      if (prev === "default") return "points-asc"
      if (prev === "points-asc") return "points-desc"
      return "default"
    })
  }

  const sortRules = (rules: typeof state.rules) => {
    if (sortMode === "default") return rules
    return [...rules].sort((a, b) => {
      if (sortMode === "points-asc") return Math.abs(a.points) - Math.abs(b.points)
      return Math.abs(b.points) - Math.abs(a.points)
    })
  }

  const getIntervalStatus = (ruleId: string, childId: string, intervalMinutes?: number) => {
    if (!intervalMinutes) return { canApply: true, remainingMinutes: 0 }

    const applications = (state.ruleApplications ?? [])
      .filter((a) => a.ruleId === ruleId && a.childId === childId)
      .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())

    if (applications.length === 0) return { canApply: true, remainingMinutes: 0 }

    const lastApplication = applications[0]
    const lastTime = new Date(lastApplication.appliedAt).getTime()
    const now = Date.now()
    const elapsedMinutes = Math.floor((now - lastTime) / (1000 * 60))
    const remainingMinutes = intervalMinutes - elapsedMinutes

    return {
      canApply: remainingMinutes <= 0,
      remainingMinutes: Math.max(0, remainingMinutes),
    }
  }

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

  const handleApplyRule = (ruleId: string) => {
    const rule = (state.rules ?? []).find((r) => r.id === ruleId)
    if (!rule) return

    // Check daily limit
    if (rule.dailyLimit) {
      const todayApplications = getTodayRuleApplications(selectedChild.id, ruleId)
      if (todayApplications >= rule.dailyLimit) return
    }

    const intervalStatus = getIntervalStatus(ruleId, selectedChild.id, rule.repeatInterval)
    if (!intervalStatus.canApply) return

    void applyRule(ruleId, selectedChild.id, rule.points)

    setAppliedId(ruleId)

    setCelebration({
      active: true,
      points: rule.points,
      message: `${rule.emoji} ${rule.title} ${rule.isPositive ? "belohnt" : "angewendet"}!`,
    })

    setTimeout(() => {
      setAppliedId(null)
      setCelebration((c) => ({ ...c, active: false }))
    }, 2000)
  }

  // Group rules by type
  const categories = [
    { key: "positive", label: "Gutes Verhalten", emoji: "👍", isPositive: true },
    { key: "negative", label: "Regelverstöße", emoji: "👎", isPositive: false },
  ]

  const activeRules = (state.rules ?? []).filter((r) => r.isActive)

  return (
    <AppShell>
      <CelebrationOverlay
        trigger={celebration.active}
        points={celebration.points}
        message={celebration.message}
        onComplete={() => setCelebration((c) => ({ ...c, active: false }))}
        enableConfetti={state.settings.showConfetti}
      />

      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground">Verhaltensregeln</h1>
            <p className="text-muted-foreground">Belohne oder korrigiere Verhalten</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cycleSortMode}
              className="flex items-center gap-1 bg-transparent"
            >
              {sortMode === "default" && <ArrowUpDown className="w-4 h-4" />}
              {sortMode === "points-asc" && <ArrowUp className="w-4 h-4" />}
              {sortMode === "points-desc" && <ArrowDown className="w-4 h-4" />}
              <Star className="w-3 h-3" />
            </Button>
            <div className="px-4 py-2 bg-points/20 rounded-full">
              <PointsDisplay points={selectedChild.points} size="md" />
            </div>
          </div>
        </div>

        {/* Rules by Category */}
        {categories.map((cat) => {
          const categoryRules = sortRules(activeRules.filter((r) => r.isPositive === cat.isPositive))
          if (categoryRules.length === 0) return null

          return (
            <section key={cat.key} className="mb-8">
              <h2 className="flex items-center gap-2 font-semibold text-lg text-foreground mb-4">
                <span>{cat.emoji}</span>
                {cat.label}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {categoryRules.map((rule) => {
                  const justApplied = appliedId === rule.id
                  const todayApplications = getTodayRuleApplications(selectedChild.id, rule.id)
                  const limitReached = rule.dailyLimit ? todayApplications >= rule.dailyLimit : false
                  const intervalStatus = getIntervalStatus(rule.id, selectedChild.id, rule.repeatInterval)
                  const isBlocked = limitReached || !intervalStatus.canApply

                  return (
                    <div
                      key={rule.id}
                      className={cn(
                        "relative flex flex-col items-center p-4 bg-card rounded-2xl transition-all neu-flat",
                        isBlocked && "opacity-60",
                        justApplied && "animate-bounce-in",
                      )}
                    >
                      {/* Emoji */}
                      <div className="text-4xl mb-2">{rule.emoji}</div>

                      {/* Title */}
                      <p className="font-medium text-foreground text-center text-sm mb-1">{rule.title}</p>

                      {/* Points */}
                      <div
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium mb-3",
                          rule.isPositive
                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                            : "bg-red-500/20 text-red-600 dark:text-red-400",
                        )}
                      >
                        {rule.isPositive ? (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        ) : (
                          <ThumbsDown className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {rule.isPositive ? "+" : ""}
                          {rule.points}
                        </span>
                      </div>

                      {/* Daily Limit Badge */}
                      {rule.dailyLimit && (
                        <p
                          className={cn(
                            "text-xs mb-2",
                            limitReached ? "text-destructive font-medium" : "text-muted-foreground",
                          )}
                        >
                          {todayApplications}/{rule.dailyLimit} heute
                        </p>
                      )}

                      {!intervalStatus.canApply && intervalStatus.remainingMinutes > 0 && (
                        <p className="text-xs mb-2 text-orange-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Noch {intervalStatus.remainingMinutes} Min
                        </p>
                      )}

                      {/* Apply Button */}
                      <Button
                        size="sm"
                        disabled={isBlocked || justApplied}
                        onClick={() => handleApplyRule(rule.id)}
                        className={cn(
                          "w-full rounded-full",
                          justApplied && "bg-success",
                          rule.isPositive ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600",
                        )}
                      >
                        {justApplied ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Angewendet!
                          </>
                        ) : limitReached ? (
                          "Limit erreicht"
                        ) : !intervalStatus.canApply ? (
                          "Bitte warten"
                        ) : (
                          "Anwenden"
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {activeRules.length === 0 && (
          <EmptyState icon="⚖️" title="Keine Regeln" description="Es wurden noch keine Regeln eingerichtet." />
        )}
      </div>
    </AppShell>
  )
}
