"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Rule } from "@/types"
import confetti from "canvas-confetti"

interface RuleCardProps {
  rule: Rule
  childId: string
  onApply?: () => void
}

export function RuleCard({ rule, childId, onApply }: RuleCardProps) {
  const { state, dispatch } = useFamily()
  const [isApplying, setIsApplying] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const todayApplications = (state.ruleApplications ?? []).filter(
    (app) =>
      app.ruleId === rule.id &&
      app.childId === childId &&
      app.appliedAt.startsWith(new Date().toISOString().split("T")[0]),
  )

  const isLimitReached = rule.dailyLimit && todayApplications.length >= rule.dailyLimit

  const handleApply = () => {
    if (isLimitReached) return

    setIsApplying(true)
    setShowFeedback(true)

    void applyRule(rule.id, childId, rule.points)

    if (rule.isPositive && state.settings.showConfetti) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      })
    }

    setTimeout(() => {
      setIsApplying(false)
      setShowFeedback(false)
      onApply?.()
    }, 600)
  }

  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl p-4 neu-flat transition-all hover:scale-[1.02]",
        rule.isPositive ? "border-l-4 border-green-500" : "border-l-4 border-red-500",
        isLimitReached && "opacity-50",
        isApplying && "animate-pulse",
      )}
    >
      {showFeedback && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-xl animate-[fadeIn_0.3s_ease-out] pointer-events-none flex items-center justify-center">
          <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold text-xl shadow-lg animate-bounce-in flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            <span>
              {rule.isPositive ? "+" : ""}
              {rule.points} Punkte
            </span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl">{rule.emoji}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{rule.title}</h3>
            {rule.isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          {rule.description && <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              variant={rule.isPositive ? "default" : "destructive"}
              className={cn("text-base font-bold", rule.isPositive && "bg-green-500 hover:bg-green-600")}
            >
              {rule.isPositive ? "+" : ""}
              {rule.points} Pkt
            </Badge>
            {rule.dailyLimit && (
              <span className="text-xs text-muted-foreground">
                {todayApplications.length} / {rule.dailyLimit} heute
              </span>
            )}
          </div>
        </div>
      </div>

      <Button
        onClick={handleApply}
        disabled={isLimitReached || isApplying}
        className="w-full"
        variant={rule.isPositive ? "default" : "destructive"}
      >
        {isLimitReached ? "Limit erreicht" : isApplying ? "Angewendet!" : "Anwenden"}
      </Button>
    </div>
  )
}
