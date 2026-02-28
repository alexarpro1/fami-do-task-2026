"use client"

import { cn } from "@/lib/utils"

/** Echt wirkende Goldmünze (SVG mit Verlauf und Glanz) – für Spiele-Belohnungen. */
export function GoldCoinIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="gold-coin-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
          <stop offset="30%" stopColor="#fcd34d" stopOpacity="1" />
          <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
          <stop offset="70%" stopColor="#d97706" stopOpacity="1" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="gold-coin-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="0.6" />
        </linearGradient>
        <filter id="gold-coin-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#92400e" floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Äußerer Rand (dunkler) */}
      <circle cx="12" cy="12" r="11" fill="url(#gold-coin-inner)" filter="url(#gold-coin-shadow)" />
      {/* Hauptfläche mit Glanz */}
      <circle cx="12" cy="12" r="9.5" fill="url(#gold-coin-shine)" />
      {/* Innerer Kreis (Tiefe) */}
      <circle cx="12" cy="12" r="6" fill="none" stroke="#b45309" strokeOpacity="0.5" strokeWidth="0.8" />
      {/* Glanz-Reflex oben links */}
      <ellipse cx="9" cy="9" rx="3" ry="2" fill="white" fillOpacity="0.35" />
    </svg>
  )
}
