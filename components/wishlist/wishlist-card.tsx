"use client"

import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { Star, Heart, ShoppingCart, X } from "lucide-react"
import { motion } from "framer-motion"
import type { Reward } from "@/types"

interface WishlistCardProps {
  reward: Reward
  childId: string
  currentPoints: number
  onPurchase: () => void
}

export function WishlistCard({ reward, childId, currentPoints, onPurchase }: WishlistCardProps) {
  const { dispatch } = useFamily()
  const progress = Math.min((currentPoints / reward.cost) * 100, 100)
  const canAfford = currentPoints >= reward.cost
  const pointsNeeded = reward.cost - currentPoints

  const handleRemove = () => {
    dispatch({
      type: "REMOVE_FROM_WISHLIST",
      payload: { childId, rewardId: reward.id },
    })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative bg-card rounded-2xl p-4 neu-flat"
    >
      {/* Remove Button */}
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 p-1 rounded-full bg-secondary/80 hover:bg-destructive/20 transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl">{reward.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{reward.name}</p>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="font-bold text-amber-600">{reward.cost}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>
            {currentPoints} / {reward.cost}
          </span>
          {!canAfford && <span>Noch {pointsNeeded} Punkte</span>}
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${canAfford ? "bg-green-500" : "bg-gradient-to-r from-amber-500 to-amber-400"}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Action Button */}
      <Button size="sm" className="w-full rounded-full" disabled={!canAfford} onClick={onPurchase}>
        {canAfford ? (
          <>
            <ShoppingCart className="w-4 h-4 mr-1" />
            Jetzt kaufen!
          </>
        ) : (
          <>
            <Heart className="w-4 h-4 mr-1" />
            Weiter sparen
          </>
        )}
      </Button>
    </motion.div>
  )
}
