"use client"

import type React from "react"
import type { PieceType, Color } from "@/lib/chess"
import { cn } from "@/lib/utils"

const VIEW_BOX = "0 0 45 45"
const BASE_CLASS = "w-full h-full block"

/** Moderne, detaillierte Schachfiguren als SVG – jede Figur klar erkennbar, clean & ansprechend. */

function KingSvg({ className }: { className?: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={cn(BASE_CLASS, className)} fill="currentColor" aria-hidden>
      <path d="M19.5 38h6v-3h-2v-2h-2v2h-2v3z" />
      <path d="M18 34h9v1.5H18z" />
      <path d="M20 30h5v4H20z" />
      <path d="M21.5 26h2v4h-2z" />
      <path d="M22.5 7v3.5h-2v2h-1.5v3h1v2h1v3h2v-3h1v-2h1v-3h-1.5v-2h-2V7z" />
      <circle cx="22.5" cy="11" r="1.3" />
      <path d="M15.5 14.5h2v2h-2zM27 14.5h2v2h-2z" />
    </svg>
  )
}

function QueenSvg({ className }: { className?: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={cn(BASE_CLASS, className)} fill="currentColor" aria-hidden>
      <path d="M19.5 38h6v-3h-2v-2h-2v2h-2v3z" />
      <path d="M18 34h9v1.5H18z" />
      <path d="M20 28h5v6H20z" />
      <path d="M21.5 24h2v4h-2z" />
      <path d="M22.5 6v2.5h-1.5v2h-1v4h1v2h1v4h2v-4h1v-2h1v-4h-1v-2h-1.5V6z" />
      <circle cx="22.5" cy="9.5" r="1.2" />
      <path d="M13.5 12h2v2.5h-2zM17 11h2v3h-2zM26 11h2v3h-2zM29.5 12h2v2.5h-2z" />
    </svg>
  )
}

function RookSvg({ className }: { className?: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={cn(BASE_CLASS, className)} fill="currentColor" aria-hidden>
      <path d="M16.5 38h12v-3h-12v3z" />
      <path d="M17 33h11v2H17z" />
      <path d="M18 26h9v7H18z" />
      <path d="M15.5 26h4v-5h2v-4h1v-2h4v2h1v4h2v5h4v-5h-2v-5h-1v-3h-6v3h-1v5h-2v5z" />
      <path d="M15.5 20h2v1.5h-2zM27.5 20h2v1.5h-2z" />
    </svg>
  )
}

function BishopSvg({ className }: { className?: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={cn(BASE_CLASS, className)} fill="currentColor" aria-hidden>
      <path d="M19.5 38h6v-3h-2v-2h-2v2h-2v3z" />
      <path d="M18 34h9v1.5H18z" />
      <path d="M20 26h5v8H20z" />
      <path d="M22.5 7l-2.5 5h1.5v5h2V12h1.5L22.5 7z" />
      <path d="M19 14h7v1.5h-7z" />
      <ellipse cx="22.5" cy="20" rx="2.8" ry="1.4" />
    </svg>
  )
}

function KnightSvg({ className }: { className?: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={cn(BASE_CLASS, className)} fill="currentColor" aria-hidden>
      <path d="M18.5 38h8v-3h-3v-2h-2v2h-3v3z" />
      <path d="M19 33h7v2h-7z" />
      <path d="M20 26h5v7H20z" />
      <path d="M21.5 20h2v6h-2z" />
      {/* Springer: stilisierter Pferdekopf (von links nach rechts) */}
      <path d="M15 26h2v-2h2v-3h2v-2h2v1h1v2h-1v2h-2v1h-2v2h-2v1h-1z" />
      <path d="M30 26h-1v-4h-2v-2h-1v-2h1v-1h2v2h2v3h2v2h-1v2h-2v-1h-2z" />
    </svg>
  )
}

function PawnSvg({ className }: { className?: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={cn(BASE_CLASS, className)} fill="currentColor" aria-hidden>
      <path d="M19.5 38h6v-3h-2v-2h-2v2h-2v3z" />
      <path d="M18 34h9v1.5H18z" />
      <path d="M20 26h5v8H20z" />
      <path d="M21.5 20h2v6h-2z" />
      <circle cx="22.5" cy="15" r="4" />
    </svg>
  )
}

const MODERN_PIECES: Record<PieceType, (props: { className?: string }) => React.ReactElement> = {
  K: KingSvg,
  Q: QueenSvg,
  R: RookSvg,
  B: BishopSvg,
  N: KnightSvg,
  P: PawnSvg,
}

export interface ChessPieceModernProps {
  pieceType: PieceType
  color: Color
  className?: string
  inCheck?: boolean
}

export function ChessPieceModern({ pieceType, color, className, inCheck }: ChessPieceModernProps) {
  const Icon = MODERN_PIECES[pieceType]
  if (!Icon) return null
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center flex-shrink-0 [&_svg]:fill-current",
        inCheck && "text-red-600 dark:text-red-400",
        !inCheck && color === "w" && "text-neutral-900 drop-shadow-[0_0_1px_white]",
        !inCheck && color === "b" && "text-white drop-shadow-[0_0_1px_black]",
        className,
      )}
    >
      <Icon />
    </span>
  )
}
