"use client"

import { useEffect, useState } from "react"

interface ConfettiPiece {
  id: number
  x: number
  color: string
  delay: number
  rotation: number
  width: number
  height: number
  isRound: boolean
}

interface ConfettiProps {
  active: boolean
  duration?: number
  onComplete?: () => void
}

const COLORS = ["#FF6B9D", "#4ECDC4", "#FFD700", "#FF9F1C", "#9B59B6", "#2ECC71", "#45B7D1"]

export function Confetti({ active, duration = 3000, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    if (active) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => {
        const isRect = Math.random() > 0.3
        return {
          id: i,
          x: Math.random() * 100,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 0.5,
          rotation: Math.random() * 360,
          width: isRect ? 10 + Math.random() * 8 : 10 + Math.random() * 6,
          height: isRect ? 6 + Math.random() * 4 : 10 + Math.random() * 6,
          isRound: !isRect,
        }
      })
      setPieces(newPieces)

      // Clear after duration
      const timer = setTimeout(() => {
        setPieces([])
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [active, duration, onComplete])

  if (!active || pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti"
          style={{
            left: `${piece.x}%`,
            top: "-20px",
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            borderRadius: piece.isRound ? "50%" : "2px",
            animationDelay: `${piece.delay}s`,
            transform: `rotate(${piece.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}
