"use client"

import type React from "react"

interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  children?: React.ReactNode
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = "var(--primary)",
  backgroundColor = "var(--secondary)",
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background Circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={backgroundColor} strokeWidth={strokeWidth} />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
