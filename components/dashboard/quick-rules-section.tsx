"use client"

import { useState } from "react"
import Link from "next/link"
import type { Rule } from "@/types"
import { cn } from "@/lib/utils"

export interface QuickRulesSectionProps {
  /** Bis zu 8 Schnell-Regeln (Favoriten). */
  rules: Rule[]
  childId: string
  /** Heutige Anwendungen pro Regel (für Limit-Check). */
  todayApplicationCount: (ruleId: string) => number
  onRuleApply: (rule: Rule) => void
}

function QuickRuleButton({
  rule,
  isLimitReached,
  onApply,
}: {
  rule: Rule
  isLimitReached: boolean
  onApply: () => void
}) {
  const [showLocalPopup, setShowLocalPopup] = useState(false)
  const [isApplied, setIsApplied] = useState(false)

  const handleClick = () => {
    if (isLimitReached || isApplied) return
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
      type="button"
      onClick={handleClick}
      disabled={isLimitReached}
      className={cn(
        "relative flex flex-col items-center gap-0.5 p-3 sm:p-4 rounded-xl transition-all",
        isApplied ? "scale-95" : "hover:scale-105",
        rule.isPositive ? "bg-green-500/10 hover:bg-green-500/20" : "bg-red-500/10 hover:bg-red-500/20",
        isLimitReached && "opacity-50 cursor-not-allowed",
      )}
    >
      {showLocalPopup && (
        <div
          className={cn(
            "absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-1 rounded-full text-sm font-bold animate-bounce",
            rule.isPositive ? "bg-green-500 text-white" : "bg-red-500 text-white",
          )}
        >
          {rule.isPositive ? "+" : ""}
          {rule.points}
        </div>
      )}
      <span className={cn("text-2xl mb-1 transition-transform", isApplied && "scale-125")}>{rule.emoji}</span>
      <span className="text-xs font-medium text-foreground text-center line-clamp-1">
        {isApplied ? "Angewendet!" : rule.title}
      </span>
      <span className={cn("text-xs font-bold", rule.isPositive ? "text-green-500" : "text-red-500")}>
        {rule.isPositive ? "+" : ""}
        {rule.points}
      </span>
    </button>
  )
}

/** Modulare Karte „Schnell-Regeln“ für die Startseite. */
export function QuickRulesSection({ rules, childId, todayApplicationCount, onRuleApply }: QuickRulesSectionProps) {
  if (rules.length === 0) return null

  return (
    <section className="bg-card rounded-2xl p-4 neu-flat">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Schnell-Regeln</h3>
        <Link href="/rules" className="text-sm text-primary font-medium">
          Alle anzeigen
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {rules.slice(0, 8).map((rule) => {
          const count = todayApplicationCount(rule.id)
          const isLimitReached = rule.dailyLimit ? count >= rule.dailyLimit : false
          return (
            <QuickRuleButton
              key={rule.id}
              rule={rule}
              isLimitReached={isLimitReached}
              onApply={() => onRuleApply(rule)}
            />
          )
        })}
      </div>
    </section>
  )
}
