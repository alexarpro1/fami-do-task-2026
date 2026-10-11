"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { useDeviceRole } from "@/hooks/useDeviceRole"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Sparkles, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Rule } from "@/types"
import confetti from "canvas-confetti"
import { triggerLightClick, triggerSuccess } from "@/lib/haptics"
import { PinLogin } from "@/components/admin/pin-login"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface RuleCardProps {
  rule: Rule
  childId: string
  onApply?: () => void
}

export function RuleCard({ rule, childId, onApply }: RuleCardProps) {
  const { state, dispatch } = useFamily()
  const [deviceRole] = useDeviceRole()
  const { applyRule, approveRuleApplication } = useSupabaseMutations()
  const [isApplying, setIsApplying] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackPending, setFeedbackPending] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [showParentOnlyMessage, setShowParentOnlyMessage] = useState(false)
  const [pendingToApprove, setPendingToApprove] = useState<string | null>(null)
  const canApprove = deviceRole === "parent" || deviceRole === "master"

  const today = new Date().toISOString().split("T")[0]
  const todayApplications = (state.ruleApplications ?? []).filter(
    (app) =>
      app.ruleId === rule.id &&
      app.childId === childId &&
      app.appliedAt.startsWith(today),
  )
  const pendingApplications = todayApplications.filter((app) => app.status === "pending")

  const isLimitReached = rule.dailyLimit && todayApplications.length >= rule.dailyLimit
  const requiresApproval = rule.requiresApproval === true

  const handleApply = () => {
    if (isLimitReached) return

    setIsApplying(true)
    if (requiresApproval) {
      setFeedbackPending(true)
      void triggerLightClick()
    } else {
      setShowFeedback(true)
      if (rule.isPositive && state.settings.showConfetti) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
      }
    }

    void applyRule(rule.id, childId, rule.points)

    setTimeout(() => {
      setIsApplying(false)
      setShowFeedback(false)
      setFeedbackPending(false)
      onApply?.()
    }, 600)
  }

  const handlePendingClick = () => {
    const first = pendingApplications[0]
    if (!first) return
    if (!canApprove) {
      setShowParentOnlyMessage(true)
      return
    }
    setPendingToApprove(first.id)
    setShowPinModal(true)
  }

  const handlePinSuccess = () => {
    if (pendingToApprove) {
      approveRuleApplication(pendingToApprove)
      setPendingToApprove(null)
      setShowPinModal(false)
      void triggerSuccess()
      if (rule.isPositive && state.settings.showConfetti) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
      }
    }
  }

  const adminPin = state.settings?.adminPin ?? "1234"

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
      {feedbackPending && (
        <div className="absolute inset-0 bg-amber-500/20 rounded-xl animate-[fadeIn_0.3s_ease-out] pointer-events-none flex items-center justify-center">
          <div className="bg-amber-500 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Wartet auf Bestätigung
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
            {pendingApplications.length > 0 && (
              <button
                type="button"
                onClick={handlePendingClick}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-xs font-medium hover:bg-amber-500/30"
              >
                <Clock className="w-3 h-3" />
                Wartet auf Mama/Papa ({pendingApplications.length})
              </button>
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
        {isLimitReached ? "Limit erreicht" : isApplying ? (requiresApproval ? "Wartet…" : "Angewendet!") : "Anwenden"}
      </Button>

      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Freigabe bestätigen</DialogTitle>
            <DialogDescription>
              PIN eingeben, um die Punkte für „{rule.title}" freizugeben.
            </DialogDescription>
          </DialogHeader>
          <PinLogin
            correctPin={adminPin}
            onSuccess={handlePinSuccess}
            onCancel={() => {
              setShowPinModal(false)
              setPendingToApprove(null)
            }}
            title="Freigabe"
            subtitle="Admin-PIN"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showParentOnlyMessage} onOpenChange={setShowParentOnlyMessage}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nur für Eltern</DialogTitle>
            <DialogDescription>
              Nur Mama oder Papa können die Punkte freigeben.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowParentOnlyMessage(false)} className="w-full">
            OK
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
