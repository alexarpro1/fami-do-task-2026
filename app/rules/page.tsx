"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { useSelectedChild } from "@/hooks/useChildren"
import { useRules } from "@/hooks/useRules"
import { useChildPoints } from "@/hooks/useCompletions"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { PointsDisplay } from "@/components/points/points-display"
import { CelebrationOverlay } from "@/components/effects/celebration-overlay"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ThumbsUp, ThumbsDown, Check } from "lucide-react"

export default function RulesPage() {
  const { state } = useFamily()
  const { selectedChild } = useSelectedChild()
  const { rules, applyRule } = useRules()
  const { points: childPoints } = useChildPoints(selectedChild?.id ?? null)

  const [celebration, setCelebration] = useState<{ active: boolean; points: number; message: string }>({
    active: false,
    points: 0,
    message: "",
  })
  const [appliedId, setAppliedId] = useState<string | null>(null)

  const activeRules = rules.filter((r) => r.is_active === 1)

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

  const handleApplyRule = async (ruleId: string, pointImpact: number, emoji: string, title: string) => {
    await applyRule(ruleId, selectedChild.id, pointImpact)
    setAppliedId(ruleId)
    setCelebration({
      active: true,
      points: pointImpact,
      message: `${emoji} ${title} ${pointImpact >= 0 ? "belohnt" : "angewendet"}!`,
    })
    setTimeout(() => {
      setAppliedId(null)
      setCelebration((c) => ({ ...c, active: false }))
    }, 2000)
  }

  const positiveRules = activeRules.filter((r) => r.point_impact >= 0)
  const negativeRules = activeRules.filter((r) => r.point_impact < 0)

  return (
    <AppShell>
      <CelebrationOverlay
        trigger={celebration.active}
        points={celebration.points}
        message={celebration.message}
        onComplete={() => setCelebration((c) => ({ ...c, active: false }))}
        enableConfetti={state.settings?.showConfetti}
      />

      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground">Verhaltensregeln</h1>
            <p className="text-muted-foreground">Belohne oder korrigiere Verhalten</p>
          </div>
          <div className="px-4 py-2 bg-points/20 rounded-full">
            <PointsDisplay points={childPoints} size="md" />
          </div>
        </div>

        {positiveRules.length > 0 && (
          <section className="mb-8">
            <h2 className="flex items-center gap-2 font-semibold text-lg text-foreground mb-4">
              <span>👍</span>
              Gutes Verhalten
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {positiveRules.map((rule) => {
                const justApplied = appliedId === rule.id
                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "relative flex flex-col items-center p-4 bg-card rounded-2xl transition-all neu-flat",
                      justApplied && "animate-bounce-in",
                    )}
                  >
                    <div className="text-4xl mb-2">{rule.emoji}</div>
                    <p className="font-medium text-foreground text-center text-sm mb-1">{rule.title}</p>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium mb-3 bg-green-500/20 text-green-600 dark:text-green-400">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>+{rule.point_impact}</span>
                    </div>
                    <Button
                      size="sm"
                      disabled={justApplied}
                      onClick={() => handleApplyRule(rule.id, rule.point_impact, rule.emoji, rule.title)}
                      className={cn("w-full rounded-full", justApplied && "bg-success")}
                    >
                      {justApplied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Angewendet!
                        </>
                      ) : (
                        "Anwenden"
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {negativeRules.length > 0 && (
          <section className="mb-8">
            <h2 className="flex items-center gap-2 font-semibold text-lg text-foreground mb-4">
              <span>👎</span>
              Regelverstöße
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {negativeRules.map((rule) => {
                const justApplied = appliedId === rule.id
                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "relative flex flex-col items-center p-4 bg-card rounded-2xl transition-all neu-flat",
                      justApplied && "animate-bounce-in",
                    )}
                  >
                    <div className="text-4xl mb-2">{rule.emoji}</div>
                    <p className="font-medium text-foreground text-center text-sm mb-1">{rule.title}</p>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium mb-3 bg-red-500/20 text-red-600 dark:text-red-400">
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>{rule.point_impact}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={justApplied}
                      onClick={() => handleApplyRule(rule.id, rule.point_impact, rule.emoji, rule.title)}
                      className={cn("w-full rounded-full", justApplied && "bg-success")}
                    >
                      {justApplied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Angewendet!
                        </>
                      ) : (
                        "Anwenden"
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {activeRules.length === 0 && (
          <EmptyState icon="⚖️" title="Keine Regeln" description="Es wurden noch keine Regeln eingerichtet." />
        )}
      </div>
    </AppShell>
  )
}
