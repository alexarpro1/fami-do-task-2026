"use client"

import { useMemo } from "react"

interface ConfettiPiece {
  id: number
  x: number
  color: string
  delay: number
  duration: number
  width: number
  height: number
  isRound: boolean
  rotation: number
}

const COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"]

function createPieces(): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = []
  for (let i = 0; i < 50; i++) {
    const isRect = Math.random() > 0.3
    pieces.push({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      width: isRect ? 10 + Math.random() * 6 : 8 + Math.random() * 6,
      height: isRect ? 6 + Math.random() * 4 : 8 + Math.random() * 6,
      isRound: !isRect,
      rotation: Math.random() * 360,
    })
  }
  return pieces
}

export function ConfettiEffect() {
  const pieces = useMemo(() => createPieces(), [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: "-20px",
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            borderRadius: piece.isRound ? "50%" : "2px",
            transform: `rotate(${piece.rotation}deg)`,
            animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}
