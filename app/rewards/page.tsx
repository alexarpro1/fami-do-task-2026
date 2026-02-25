"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { useSelectedChild } from "@/hooks/useChildren"
import { useRewards } from "@/hooks/useRewards"
import { useChildPoints } from "@/hooks/useCompletions"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { PointsDisplay } from "@/components/points/points-display"
import { CelebrationOverlay } from "@/components/effects/celebration-overlay"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Star, ShoppingCart, Check } from "lucide-react"

export default function RewardsPage() {
  const { state } = useFamily()
  const { selectedChild } = useSelectedChild()
  const { rewards, redeemReward } = useRewards()
  const { points: childPoints } = useChildPoints(selectedChild?.id ?? null)

  const [celebration, setCelebration] = useState<{ active: boolean; points: number; message: string }>({
    active: false,
    points: 0,
    message: "",
  })
  const [purchasedId, setPurchasedId] = useState<string | null>(null)

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

  const handlePurchase = async (rewardId: string, cost: number, emoji: string, title: string) => {
    if (childPoints < cost) return

    await redeemReward(rewardId, selectedChild.id, cost)

    setPurchasedId(rewardId)
    setCelebration({
      active: true,
      points: -cost,
      message: `${emoji} ${title} eingelöst!`,
    })

    setTimeout(() => {
      setPurchasedId(null)
      setCelebration((c) => ({ ...c, active: false }))
    }, 3000)
  }

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
            <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground">Belohnungs-Shop</h1>
            <p className="text-muted-foreground">Löse deine Punkte ein!</p>
          </div>
          <div className="px-4 py-2 bg-points/20 rounded-full">
            <PointsDisplay points={childPoints} size="md" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {rewards.map((reward) => {
            const canAfford = childPoints >= reward.cost
            const justPurchased = purchasedId === reward.id

            return (
              <div
                key={reward.id}
                className={cn(
                  "relative flex flex-col items-center p-4 bg-card rounded-2xl transition-all neu-flat",
                  !canAfford && "opacity-60",
                  justPurchased && "animate-bounce-in",
                )}
              >
                <div className="text-4xl mb-2">{reward.emoji}</div>
                <p className="font-medium text-foreground text-center text-sm mb-1">{reward.title}</p>
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium mb-3",
                    canAfford ? "bg-points/20 text-points-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{reward.cost}</span>
                </div>
                <Button
                  size="sm"
                  disabled={!canAfford || justPurchased}
                  onClick={() => handlePurchase(reward.id, reward.cost, reward.emoji, reward.title)}
                  className={cn("w-full rounded-full", justPurchased && "bg-success")}
                >
                  {justPurchased ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Gekauft!
                    </>
                  ) : !canAfford ? (
                    "Zu wenig Punkte"
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Einlösen
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        {rewards.length === 0 && (
          <EmptyState
            icon="🎁"
            title="Keine Belohnungen"
            description="Es wurden noch keine Belohnungen eingerichtet."
          />
        )}
      </div>
    </AppShell>
  )
}
