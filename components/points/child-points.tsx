"use client"

import { useFamily } from "@/context/family-context"
import { PointsDisplay } from "@/components/points/points-display"
import { cn } from "@/lib/utils"

interface ChildPointsProps {
  childId: string
  labelOnly?: boolean
  showLoading?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ChildPoints({ childId, labelOnly, showLoading, size = "sm", className }: ChildPointsProps) {
  const { state } = useFamily()
  const child = state.children.find((c) => c.id === childId)
  const points = child?.points ?? 0

  if (showLoading && !child) {
    return (
      <span className={cn("inline-block h-5 w-12 animate-pulse rounded bg-muted", className)} aria-hidden />
    )
  }

  if (labelOnly) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        <PointsDisplay points={points} size={size} showAnimation={false} />
      </span>
    )
  }

  return (
    <PointsDisplay points={points} size={size} className={className} />
  )
}
