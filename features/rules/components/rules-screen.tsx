"use client"

import { useMemo, useState } from "react"
import type { Rule } from "@/types"
import { AppShell } from "@shell/components/app-shell"
import { useFamily } from "@env/context/family-context"
import { useSupabaseMutations } from "@env/hooks/useSupabaseMutations"
import { EmptyState } from "@ui/components/empty-state"
import { Button } from "@ui/components/button"
import { PointsDisplay } from "@/components/points/points-display"
import { CelebrationOverlay } from "@ui/effects/celebration-overlay"
import { cn } from "@/lib/utils"
import { useTranslation } from "@env/hooks/use-translation"
import Link from "next/link"
import { Star, ThumbsUp, ThumbsDown, Check, ArrowUpDown, ArrowUp, ArrowDown, Clock } from "lucide-react"
import { ViewModeToggle } from "@ui/components/view-mode-toggle"
import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode"
import { usePersistedPreference } from "@/hooks/use-persisted-preference"

type SortMode = "default" | "points-asc" | "points-desc"
type ViewMode = "list" | "grid"

const RULES_SORT_MODES: SortMode[] = ["default", "points-asc", "points-desc"]

function isRulesSortMode(v: unknown): v is SortMode {
  return typeof v === "string" && (RULES_SORT_MODES as string[]).includes(v)
}

function compareRulesForSort(a: Rule, b: Rule, mode: SortMode): number {
  if (mode === "default") {
    const oa = a.order ?? 0
    const ob = b.order ?? 0
    if (oa !== ob) return oa - ob
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  }
  const pa = Number(a.points)
  const pb = Number(b.points)
  if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) {
    return mode === "points-asc" ? pa - pb : pb - pa
  }
  const oa = a.order ?? 0
  const ob = b.order ?? 0
  if (oa !== ob) return oa - ob
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
}

export function RulesScreen() {
  const { state, selectedChild, getTodayRuleApplications } = useFamily()
  const { t, translate } = useTranslation()
  const { applyRule } = useSupabaseMutations()
  const [celebration, setCelebration] = useState<{ active: boolean; points: number; message: string }>({
    active: false,
    points: 0,
    message: "",
  })
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const [sortMode, setSortMode] = usePersistedPreference<SortMode>("rules-sort", "default", isRulesSortMode)
  const [viewMode, setViewMode] = usePersistedViewMode("rules", "grid")

  const cycleSortMode = () => {
    const idx = RULES_SORT_MODES.indexOf(sortMode)
    setSortMode(RULES_SORT_MODES[(idx + 1) % RULES_SORT_MODES.length])
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
          title={translate("empty.noChild")}
          description={translate("emptyStates.selectChildFirst")}
          action={
            <Link href="/">
              <Button>{translate("common.back")}</Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  const handleApplyRule = (ruleId: string) => {
    const rule = (state.rules ?? []).find((r) => r.id === ruleId)
    if (!rule) return

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
      message: `${rule.emoji} ${rule.title} ${rule.isPositive ? translate("rules.rewarded") : translate("rules.applied")}!`,
    })

    setTimeout(() => {
      setAppliedId(null)
      setCelebration((c) => ({ ...c, active: false }))
    }, 2000)
  }

  const categories = [
    { key: "positive", label: t.rules.goodBehavior, emoji: "👍", isPositive: true },
    { key: "negative", label: t.rules.badBehavior, emoji: "👎", isPositive: false },
  ]

  const activeRules = (state.rules ?? []).filter((r) => r.isActive)

  const sortedRulesByCategory = useMemo(() => {
    const active = (state.rules ?? []).filter((r) => r.isActive)
    const pos = active.filter((r) => r.isPositive)
    const neg = active.filter((r) => !r.isPositive)
    return {
      positive: [...pos].sort((a, b) => compareRulesForSort(a, b, sortMode)),
      negative: [...neg].sort((a, b) => compareRulesForSort(a, b, sortMode)),
    }
  }, [state.rules, sortMode])

  return (
    <AppShell>
      <CelebrationOverlay
        trigger={celebration.active}
        points={celebration.points}
        message={celebration.message}
        onComplete={() => setCelebration((c) => ({ ...c, active: false }))}
        enableConfetti={state.settings.showConfetti}
      />

      <div className="px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="font-[var(--font-fredoka)] truncate text-2xl font-bold text-foreground">
                {t.rules.title}
              </h1>
              <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 px-2 text-sm font-bold tabular-nums text-primary">
                {activeRules.length}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{t.rules.behaviorRules}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cycleSortMode}
              className="h-9 gap-1 rounded-xl border-border/70 bg-card/50 px-2.5"
              aria-label={translate("rules.sortByPoints")}
            >
              {sortMode === "default" && <ArrowUpDown className="h-4 w-4" />}
              {sortMode === "points-asc" && <ArrowUp className="h-4 w-4" />}
              {sortMode === "points-desc" && <ArrowDown className="h-4 w-4" />}
              <Star className="h-3 w-3" />
            </Button>
            <ViewModeToggle value={viewMode} onChange={setViewMode} size="sm" />
          </div>
        </div>

        {categories.map((cat) => {
          const categoryRules = cat.isPositive ? sortedRulesByCategory.positive : sortedRulesByCategory.negative
          if (categoryRules.length === 0) return null

          return (
            <section key={cat.key} className="mb-7 sm:mb-8">
              <h2 className="flex items-center gap-2 font-semibold text-lg text-foreground mb-4">
                <span>{cat.emoji}</span>
                {cat.label}
              </h2>

              <div
                className={
                  viewMode === "grid"
                    ? "grid min-w-0 grid-cols-2 gap-2 auto-rows-fr items-stretch sm:grid-cols-2 sm:gap-4"
                    : "flex min-w-0 flex-col gap-3"
                }
              >
                {categoryRules.map((rule) => {
                  const justApplied = appliedId === rule.id
                  const todayApplications = getTodayRuleApplications(selectedChild.id, rule.id)
                  const limitReached = rule.dailyLimit ? todayApplications >= rule.dailyLimit : false
                  const intervalStatus = getIntervalStatus(rule.id, selectedChild.id, rule.repeatInterval)
                  const isBlocked = limitReached || !intervalStatus.canApply

                  return (
                    <div
                      key={rule.id}
                      role={!isBlocked && !justApplied ? "button" : undefined}
                      tabIndex={!isBlocked && !justApplied ? 0 : undefined}
                      onClick={
                        !isBlocked && !justApplied ? () => handleApplyRule(rule.id) : undefined
                      }
                      onKeyDown={
                        !isBlocked && !justApplied
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                handleApplyRule(rule.id)
                              }
                            }
                          : undefined
                      }
                      className={cn(
                        "fdt-hero-surface flex flex-col items-center p-4 transition-all",
                        viewMode === "grid" && "h-full min-h-[13rem] w-full min-w-0 justify-between",
                        isBlocked && "opacity-60",
                        justApplied && "animate-bounce-in",
                        !isBlocked &&
                          !justApplied &&
                          "cursor-pointer hover:scale-[1.02] active:scale-[0.99]",
                      )}
                    >
                      <div className="text-4xl mb-2">{rule.emoji}</div>

                      <p className="font-medium text-foreground text-center text-sm mb-1">{rule.title}</p>

                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold mb-3 border shadow-sm tabular-nums",
                          rule.isPositive
                            ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/35 dark:bg-emerald-400/20 dark:text-emerald-200 dark:border-emerald-300/35"
                            : "bg-rose-500/15 text-rose-700 border-rose-500/35 dark:bg-rose-400/20 dark:text-rose-200 dark:border-rose-300/35",
                        )}
                      >
                        {rule.isPositive ? (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        ) : (
                          <ThumbsDown className="w-3.5 h-3.5" />
                        )}
                        <span className="font-[var(--font-fredoka)]">
                          {rule.isPositive ? "+" : ""}
                          {rule.points}
                        </span>
                      </div>

                      {rule.dailyLimit && (
                        <p
                          className={cn(
                            "text-xs mb-2",
                            limitReached ? "text-destructive font-medium" : "text-muted-foreground",
                          )}
                        >
                          {todayApplications}/{rule.dailyLimit} {translate("rules.dailyLimit").toLowerCase()}
                        </p>
                      )}

                      {!intervalStatus.canApply && intervalStatus.remainingMinutes > 0 && (
                        <p className="text-xs mb-2 text-orange-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {translate("status.remainingMinutes", { minutes: intervalStatus.remainingMinutes })}
                        </p>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        disabled={isBlocked || justApplied}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApplyRule(rule.id)
                        }}
                        className={cn(
                          "w-full rounded-full",
                          justApplied && "bg-success",
                          rule.isPositive ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600",
                        )}
                      >
                        {justApplied ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            {translate("rules.applied")}!
                          </>
                        ) : limitReached ? (
                          translate("status.limitReached")
                        ) : !intervalStatus.canApply ? (
                          translate("status.pleaseWait")
                        ) : (
                          translate("rules.apply")
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
          <EmptyState icon="⚖️" title={translate("empty.noRules")} description={translate("empty.noRulesDesc")} />
        )}
      </div>
    </AppShell>
  )
}

