"use client"

import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Phase 18: Zeigt offene Freigaben (pending Rule-Applications).
 * Nur sichtbar wenn deviceRole === "parent" || "master" (wird von außen gesteuert).
 */
export function PendingApprovalsWidget() {
  const { state } = useFamily()
  const { approveRuleApplication, rejectRuleApplication } = useSupabaseMutations()

  const pending = (state.ruleApplications ?? []).filter((app) => app.status === "pending")
  const rules = state.rules ?? []
  const children = state.children ?? []

  const getRuleTitle = (ruleId: string) => rules.find((r) => r.id === ruleId)?.title ?? "Regel"
  const getChildName = (childId: string) => children.find((c) => c.id === childId)?.name ?? "Kind"

  if (pending.length === 0) return null

  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold text-foreground">
          {pending.length} offene Freigabe{pending.length !== 1 ? "n" : ""}
        </span>
        <Badge variant="secondary" className="ml-auto bg-amber-500/20 text-amber-700 dark:text-amber-400">
          {pending.length}
        </Badge>
      </div>
      <ul className="space-y-2">
        {pending.map((app) => (
          <li
            key={app.id}
            className={cn(
              "flex flex-wrap items-center gap-2 p-2 rounded-lg bg-background/50",
              "border border-border",
            )}
          >
            <span className="text-sm text-muted-foreground flex-1 min-w-0">
              <span className="font-medium text-foreground">{getChildName(app.childId)}</span>
              {" – "}
              {getRuleTitle(app.ruleId)}
              {app.pointsChanged !== 0 && (
                <span className="ml-1 font-medium">
                  ({app.pointsChanged > 0 ? "+" : ""}
                  {app.pointsChanged} Pkt)
                </span>
              )}
            </span>
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                variant="default"
                className="h-8 gap-1 rounded-lg"
                onClick={() => approveRuleApplication(app.id)}
              >
                <Check className="w-3.5 h-3.5" />
                Genehmigen
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 rounded-lg text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={() => rejectRuleApplication(app.id)}
              >
                <X className="w-3.5 h-3.5" />
                Ablehnen
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
