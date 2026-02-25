"use client"

import { useEffect, useState } from "react"
import { Star, Coins } from "lucide-react"

interface PointsPopupProps {
  points: number
  show: boolean
  onComplete?: () => void
  /** "points" = Punkte (Star), "coins" = Goldmünzen (Spiele-Belohnung) */
  variant?: "points" | "coins"
}

export function PointsPopup({ points, show, onComplete, variant = "points" }: PointsPopupProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!visible) return null

  const isPositive = points > 0
  const isCoins = variant === "coins"

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="animate-bounce-in">
        <div
          className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl ${
            isCoins
              ? isPositive
                ? "bg-amber-500 text-amber-950"
                : "bg-destructive text-destructive-foreground"
              : isPositive
                ? "bg-success text-success-foreground"
                : "bg-destructive text-destructive-foreground"
          }`}
        >
          {isCoins ? (
            <Coins className="w-8 h-8 fill-current" />
          ) : (
            <Star className="w-8 h-8 fill-current" />
          )}
          <span className="font-[var(--font-fredoka)] text-3xl font-bold">
            {isPositive ? "+" : ""}
            {points}
          </span>
          {isCoins && (
            <span className="font-[var(--font-fredoka)] text-lg font-semibold opacity-90">
              Goldmünzen
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
