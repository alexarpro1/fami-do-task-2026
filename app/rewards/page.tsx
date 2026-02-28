"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import { triggerSuccess } from "@/lib/haptics"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { PointsDisplay } from "@/components/points/points-display"
import { CelebrationOverlay } from "@/components/effects/celebration-overlay"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Star, ShoppingCart, Check, ArrowUpDown, ArrowUp, ArrowDown, Clock, Heart } from "lucide-react"

type SortMode = "default" | "cost-asc" | "cost-desc"

export default function RewardsPage() {
  const { selectedChild, state, dispatch } = useFamily()
  const { redeemReward } = useSupabaseMutations()
  const [celebration, setCelebration] = useState<{ active: boolean; points: number; message: string }>({
    active: false,
    points: 0,
    message: "",
  })
  const [purchasedId, setPurchasedId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>("default")

  const cycleSortMode = () => {
    setSortMode((prev) => {
      if (prev === "default") return "cost-asc"
      if (prev === "cost-asc") return "cost-desc"
      return "default"
    })
  }

  const sortRewards = (rewards: typeof state.rewards) => {
    if (sortMode === "default") return rewards
    return [...rewards].sort((a, b) => {
      if (sortMode === "cost-asc") return a.cost - b.cost
      return b.cost - a.cost
    })
  }

  const getTodayRedemptions = (rewardId: string, childId: string) => {
    const today = new Date().toDateString()
    return (state.rewardRedemptions ?? []).filter(
      (r) => r.rewardId === rewardId && r.childId === childId && new Date(r.redeemedAt).toDateString() === today,
    ).length
  }

  const getIntervalStatus = (rewardId: string, childId: string, intervalMinutes?: number) => {
    if (!intervalMinutes) return { canRedeem: true, remainingMinutes: 0 }

    const redemptions = (state.rewardRedemptions ?? [])
      .filter((r) => r.rewardId === rewardId && r.childId === childId)
      .sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime())

    if (redemptions.length === 0) return { canRedeem: true, remainingMinutes: 0 }

    const lastRedemption = redemptions[0]
    const lastTime = new Date(lastRedemption.redeemedAt).getTime()
    const now = Date.now()
    const elapsedMinutes = Math.floor((now - lastTime) / (1000 * 60))
    const remainingMinutes = intervalMinutes - elapsedMinutes

    return {
      canRedeem: remainingMinutes <= 0,
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

  const handlePurchase = (rewardId: string) => {
    const reward = state.rewards.find((r) => r.id === rewardId)
    if (!reward || selectedChild.points < reward.cost) return

    if (reward.dailyLimit) {
      const todayCount = getTodayRedemptions(rewardId, selectedChild.id)
      if (todayCount >= reward.dailyLimit) return
    }

    const intervalStatus = getIntervalStatus(rewardId, selectedChild.id, reward.repeatInterval)
    if (!intervalStatus.canRedeem) return

    void redeemReward(rewardId, selectedChild.id, reward.cost)
    void triggerSuccess()

    setPurchasedId(rewardId)
    setCelebration({
      active: true,
      points: -reward.cost,
      message: `${reward.emoji} ${reward.name} eingelöst!`,
    })

    setTimeout(() => {
      setPurchasedId(null)
      setCelebration((c) => ({ ...c, active: false }))
    }, 3000)
  }

  const isOnWishlist = (rewardId: string) => {
    return (selectedChild.wishlistRewardIds ?? []).includes(rewardId)
  }

  const toggleWishlist = (rewardId: string) => {
    if (isOnWishlist(rewardId)) {
      dispatch({
        type: "REMOVE_FROM_WISHLIST",
        payload: { childId: selectedChild.id, rewardId },
      })
    } else {
      dispatch({
        type: "ADD_TO_WISHLIST",
        payload: { childId: selectedChild.id, rewardId },
      })
    }
  }

  // Group rewards by category
  const categories = [
    { key: "privilege", label: "Privilegien", emoji: "👑" },
    { key: "experience", label: "Erlebnisse", emoji: "🎢" },
    { key: "item", label: "Sachen", emoji: "🎁" },
    { key: "special", label: "Spezial", emoji: "✨" },
  ]

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
            <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground">Belohnungs-Shop</h1>
            <p className="text-muted-foreground">Löse deine Punkte ein!</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cycleSortMode}
              className="flex items-center gap-1 bg-transparent"
            >
              {sortMode === "default" && <ArrowUpDown className="w-4 h-4" />}
              {sortMode === "cost-asc" && <ArrowUp className="w-4 h-4" />}
              {sortMode === "cost-desc" && <ArrowDown className="w-4 h-4" />}
              <Star className="w-3 h-3" />
            </Button>
            <div className="px-4 py-2 bg-points/20 rounded-full">
              <PointsDisplay points={selectedChild.points} size="md" />
            </div>
          </div>
        </div>

        {/* Rewards by Category */}
        {categories.map((cat) => {
          const categoryRewards = sortRewards(state.rewards.filter((r) => r.category === cat.key && r.isActive))
          if (categoryRewards.length === 0) return null

          return (
            <section key={cat.key} className="mb-8">
              <h2 className="flex items-center gap-2 font-semibold text-lg text-foreground mb-4">
                <span>{cat.emoji}</span>
                {cat.label}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {categoryRewards.map((reward) => {
                  const canAfford = selectedChild.points >= reward.cost
                  const justPurchased = purchasedId === reward.id
                  const todayCount = getTodayRedemptions(reward.id, selectedChild.id)
                  const limitReached = reward.dailyLimit ? todayCount >= reward.dailyLimit : false
                  const intervalStatus = getIntervalStatus(reward.id, selectedChild.id, reward.repeatInterval)
                  const isBlocked = !canAfford || limitReached || !intervalStatus.canRedeem
                  const onWishlist = isOnWishlist(reward.id)

                  return (
                    <div
                      key={reward.id}
                      className={cn(
                        "relative flex flex-col items-center p-4 bg-card rounded-2xl transition-all",
                        !isBlocked ? "neu-flat" : "opacity-60",
                        justPurchased && "animate-bounce-in",
                      )}
                    >
                      <button
                        onClick={() => toggleWishlist(reward.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-secondary/80 hover:bg-pink-500/20 transition-colors"
                      >
                        <Heart
                          className={cn(
                            "w-4 h-4 transition-colors",
                            onWishlist ? "text-pink-500 fill-pink-500" : "text-muted-foreground",
                          )}
                        />
                      </button>

                      {/* Emoji */}
                      <div className="text-4xl mb-2">{reward.emoji}</div>

                      {/* Name */}
                      <p className="font-medium text-foreground text-center text-sm mb-1">{reward.name}</p>

                      {/* Cost */}
                      <div
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium mb-3",
                          canAfford ? "bg-points/20 text-points-foreground" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{reward.cost}</span>
                      </div>

                      {reward.dailyLimit && (
                        <p
                          className={cn(
                            "text-xs mb-2",
                            limitReached ? "text-destructive font-medium" : "text-muted-foreground",
                          )}
                        >
                          {todayCount}/{reward.dailyLimit} heute
                        </p>
                      )}

                      {!intervalStatus.canRedeem && intervalStatus.remainingMinutes > 0 && (
                        <p className="text-xs mb-2 text-orange-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Noch {intervalStatus.remainingMinutes} Min
                        </p>
                      )}

                      {/* Buy Button */}
                      <Button
                        size="sm"
                        disabled={isBlocked || justPurchased}
                        onClick={() => handlePurchase(reward.id)}
                        className={cn("w-full rounded-full", justPurchased && "bg-success")}
                      >
                        {justPurchased ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Gekauft!
                          </>
                        ) : limitReached ? (
                          "Limit erreicht"
                        ) : !intervalStatus.canRedeem ? (
                          "Bitte warten"
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
            </section>
          )
        })}

        {state.rewards.filter((r) => r.isActive).length === 0 && (
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
