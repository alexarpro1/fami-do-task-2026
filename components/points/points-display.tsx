"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface PointsDisplayProps {
  points: number
  size?: "sm" | "md" | "lg"
  showAnimation?: boolean
  className?: string
}

export function PointsDisplay({ points, size = "md", showAnimation = true, className }: PointsDisplayProps) {
  const [displayPoints, setDisplayPoints] = useState(points)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (showAnimation && points !== displayPoints) {
      setIsAnimating(true)

      // Animate count up/down
      const diff = points - displayPoints
      const steps = Math.min(Math.abs(diff), 20)
      const stepValue = diff / steps
      let current = displayPoints
      let step = 0

      const interval = setInterval(() => {
        step++
        current += stepValue
        setDisplayPoints(Math.round(current))

        if (step >= steps) {
          setDisplayPoints(points)
          clearInterval(interval)
          setTimeout(() => setIsAnimating(false), 300)
        }
      }, 50)

      return () => clearInterval(interval)
    } else {
      setDisplayPoints(points)
    }
  }, [points, showAnimation])

  const sizeClasses = {
    sm: "text-sm gap-1",
    md: "text-lg gap-1.5",
    lg: "text-2xl gap-2",
  }

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center font-bold",
        sizeClasses[size],
        isAnimating && "animate-points-pop",
        className,
      )}
    >
      <Star className={cn(iconSizes[size], "text-points fill-points")} />
      <span>{displayPoints.toLocaleString("de-DE")}</span>
    </div>
  )
}
