"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { GoldCoinIcon } from "@/components/ui/gold-coin-icon"

interface PointsPopupProps {
  points: number
  show: boolean
  onComplete?: () => void
  /** "points" = Punkte (Star), "coins" = Goldmünzen (Spiele-Belohnung) */
  variant?: "points" | "coins"
}

const DISPLAY_DURATION_MS = 1500
const COINS_DISPLAY_DURATION_MS = 1500

export function PointsPopup({ points, show, onComplete, variant = "points" }: PointsPopupProps) {
  const [visible, setVisible] = useState(false)

  const duration = variant === "coins" ? COINS_DISPLAY_DURATION_MS : DISPLAY_DURATION_MS

  useEffect(() => {
    if (show) {
      setVisible(true)
      import("@/lib/haptics").then((m) => m.hapticSuccess())
      const timer = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete, duration])

  if (!visible) return null

  const isPositive = points > 0
  const isCoins = variant === "coins"

  const containerClass = isCoins
    ? "fixed top-16 right-4 pointer-events-none z-50"
    : "fixed inset-0 flex items-center justify-center pointer-events-none z-50"

  return (
    <div className={containerClass}>
      <div className={isCoins ? "animate-gold-coin-in" : "animate-bounce-in"}>
        <div
          className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl ${
            isCoins
              ? isPositive
                ? "bg-amber-500 text-amber-950 animate-gold-coin-glow"
                : "bg-destructive text-destructive-foreground"
              : isPositive
                ? "bg-success text-success-foreground"
                : "bg-destructive text-destructive-foreground"
          }`}
        >
          {isCoins ? (
            <GoldCoinIcon size={32} className="drop-shadow-md" />
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
