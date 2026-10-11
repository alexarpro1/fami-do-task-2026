"use client"

import type React from "react"
import type { PieceType, Color } from "@/lib/chess"
import { cn } from "@/lib/utils"

const VIEW_BOX = "0 0 45 45"
const BASE_CLASS = "w-full h-full block"

/** Premium-Figuren wie im Bild: Gold / Bronze mit dezentem Schatten, modern & klar erkennbar. */

function Defs({ suffix }: { suffix: string }) {
  return (
    <defs>
      <linearGradient id={`premium-gold-${suffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id={`premium-bronze-${suffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78b71" />
        <stop offset="50%" stopColor="#78350f" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>
    </defs>
  )
}

function KingSvg({ fill, suffix }: { fill: string; suffix: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={BASE_CLASS} fill={fill} aria-hidden>
      <Defs suffix={suffix} />
      <path d="M19.5 38h6v-3h-2v-2h-2v2h-2v3z" />
      <path d="M18 34h9v1.5H18z" />
      <path d="M20 28h5v6H20z" />
      <path d="M21.5 24h2v4h-2z" />
      <path d="M22.5 8v3h-2v2h-1.5v3h1v2h1v3h2v-3h1v-2h1v-3h-1.5v-2h-2V8z" />
      <circle cx="22.5" cy="11" r="1.4" />
      <path d="M15 15h2v2h-2zM26 15h2v2h-2z" />
    </svg>
  )
}

function QueenSvg({ fill, suffix }: { fill: string; suffix: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={BASE_CLASS} fill={fill} aria-hidden>
      <Defs suffix={suffix} />
      <path d="M19.5 38h6v-3h-2v-2h-2v2h-2v3z" />
      <path d="M18 34h9v1.5H18z" />
      <path d="M20 26h5v8H20z" />
      <path d="M21.5 22h2v4h-2z" />
      <path d="M22.5 6v2h-1.5v2h-1v5h1v2h1v4h2v-4h1v-2h1v-5h-1v-2h-1.5V6z" />
      <path d="M13 12h2v2h-2zM17 10h2v3h-2zM26 10h2v3h-2zM30 12h2v2h-2z" />
    </svg>
  )
}

function RookSvg({ fill, suffix }: { fill: string; suffix: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={BASE_CLASS} fill={fill} aria-hidden>
      <Defs suffix={suffix} />
      <path d="M16.5 38h12v-3h-12v3z" />
      <path d="M17 33h11v2H17z" />
      <path d="M18 24h9v9H18z" />
      <path d="M15.5 24h4v-4h2v-4h1v-2h5v2h1v4h2v4h4v-4h-2v-4h-1v-2h-6v2h-1v4h-2v4z" />
      <path d="M15.5 19h2v1h-2zM27.5 19h2v1h-2z" />
    </svg>
  )
}

function BishopSvg({ fill, suffix }: { fill: string; suffix: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={BASE_CLASS} fill={fill} aria-hidden>
      <Defs suffix={suffix} />
      <path d="M19.5 38h6v-3h-2v-2h-2v2h-2v3z" />
      <path d="M18 34h9v1.5H18z" />
      <path d="M20 26h5v8H20z" />
      <path d="M22.5 7l-2.5 5h1.5v6h2V12h1.5L22.5 7z" />
      <path d="M19 14h7v1.5h-7z" />
      <ellipse cx="22.5" cy="20" rx="2.8" ry="1.4" />
    </svg>
  )
}

function KnightSvg({ fill, suffix }: { fill: string; suffix: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={BASE_CLASS} fill={fill} aria-hidden>
      <Defs suffix={suffix} />
      <path d="M18.5 38h8v-3h-3v-2h-2v2h-3v3z" />
      <path d="M19 33h7v2h-7z" />
      <path d="M20 26h5v7H20z" />
      <path d="M21.5 20h2v6h-2z" />
      <path d="M28 26h-2v-4h-2v-2h-1v-2h2v1h1v3h1v2h1v2h-1v-2h-2v-1h-1z" />
      <path d="M16 26h2v-2h2v-4h1v-2h-2v1h-2v4h-1v2h1v1h2v-2h-1z" />
    </svg>
  )
}

function PawnSvg({ fill, suffix }: { fill: string; suffix: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={BASE_CLASS} fill={fill} aria-hidden>
      <Defs suffix={suffix} />
      <path d="M19.5 38h6v-3h-2v-2h-2v2h-2v3z" />
      <path d="M18 34h9v1.5H18z" />
      <path d="M20 26h5v8H20z" />
      <path d="M21.5 20h2v6h-2z" />
      <circle cx="22.5" cy="15" r="4.5" />
    </svg>
  )
}

const PREMIUM_PIECES: Record<PieceType, (props: { fill: string; suffix: string }) => React.ReactElement> = {
  K: KingSvg,
  Q: QueenSvg,
  R: RookSvg,
  B: BishopSvg,
  N: KnightSvg,
  P: PawnSvg,
}

export interface ChessPiecePremiumProps {
  pieceType: PieceType
  color: Color
  className?: string
  inCheck?: boolean
  /** Eindeutige ID für Verläufe (z. B. Square-Name), damit mehrere Figuren keine doppelten IDs haben. */
  gradientIdSuffix?: string
}

export function ChessPiecePremium({
  pieceType,
  color,
  inCheck,
  className,
  gradientIdSuffix = "0",
}: ChessPiecePremiumProps) {
  const Icon = PREMIUM_PIECES[pieceType]
  if (!Icon) return null
  const gold = `url(#premium-gold-${gradientIdSuffix})`
  const bronze = `url(#premium-bronze-${gradientIdSuffix})`
  const fill = inCheck ? "currentColor" : color === "w" ? gold : bronze
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center flex-shrink-0 [&_svg]:fill-current",
        inCheck && "text-red-600 dark:text-red-400",
        className,
      )}
    >
      <Icon fill={inCheck ? "currentColor" : fill} suffix={gradientIdSuffix} />
    </span>
  )
}
