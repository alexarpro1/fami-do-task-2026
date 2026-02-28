"use client"

import { useEffect, useState } from "react"
import { Confetti } from "./confetti"
import { PointsPopup } from "./points-popup"

interface CelebrationOverlayProps {
  trigger: boolean
  points?: number
  message?: string
  onComplete?: () => void
  /** Wenn false, wird kein Konfetti angezeigt (z. B. Einstellung "Konfetti-Effekte" aus). Standard: true. */
  enableConfetti?: boolean
  /** "points" = Punkte (Star), "coins" = Goldmünzen (Spiele-Belohnung). Standard: points. */
  variant?: "points" | "coins"
}

export function CelebrationOverlay({ trigger, points = 0, message, onComplete, enableConfetti = true, variant = "points" }: CelebrationOverlayProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showPoints, setShowPoints] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [confettiKey, setConfettiKey] = useState(0)

  useEffect(() => {
    if (trigger) {
      if (enableConfetti) {
        setConfettiKey((k) => k + 1)
        setShowConfetti(true)
      }
      setShowPoints(true)

      if (message) {
        setTimeout(() => setShowMessage(true), 500)
        setTimeout(() => setShowMessage(false), 2500)
      }
    }
  }, [trigger, message, enableConfetti])

  const handleConfettiComplete = () => {
    setShowConfetti(false)
    onComplete?.()
  }

  return (
    <>
      {enableConfetti && <Confetti key={confettiKey} active={showConfetti} onComplete={handleConfettiComplete} />}
      {variant !== "coins" && (
        <PointsPopup points={points} show={showPoints} onComplete={() => setShowPoints(false)} variant={variant} />
      )}

      {/* Optional Message */}
      {showMessage && message && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="animate-bounce-in mt-24">
            <p className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground text-center px-8 py-4 bg-card rounded-2xl shadow-xl">
              {message}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
