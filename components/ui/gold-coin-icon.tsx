"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

/** Cartoon-style gold coin (bright yellow, orange rim, bold symbol) – wie klassische Spiel-Goldmünzen. */
export function GoldCoinIcon({ className, size = 24 }: { className?: string; size?: number }) {
  const uid = `gc-${useId().replace(/:/g, "")}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <filter id={`${uid}-shadow`}>
          <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#92400E" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Orange-gold outer rim */}
      <circle cx="24" cy="24" r="22" fill="#D97706" stroke="#B45309" strokeWidth="1.5" />

      {/* Inner orange ring */}
      <circle cx="24" cy="24" r="19" fill="none" stroke="#D97706" strokeWidth="2" />

      {/* Bright yellow main body */}
      <circle cx="24" cy="24" r="17" fill="#FFD700" filter={`url(#${uid}-shadow)`} />

      {/* Bold "FdT" (Fami-do-Task) – orange-gold */}
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="bold"
        fontSize="14"
        fill="#D97706"
      >
        FdT
      </text>
    </svg>
  )
}
