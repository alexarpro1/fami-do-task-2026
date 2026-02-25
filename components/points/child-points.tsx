"use client"

import { useChildPoints } from "@/hooks/useCompletions"
import { PointsDisplay } from "./points-display"
import { cn } from "@/lib/utils"

interface ChildPointsProps {
  childId: string | null
  size?: "sm" | "md" | "lg"
  showLoading?: boolean
  /** Wenn true, nur "X Punkte" als Text (für Sidebar/Listen) */
  labelOnly?: boolean
  className?: string
}

/**
 * Live-Punkte eines Kindes aus PowerSync (task_completions).
 * Zeigt Lade-Zustand, wenn showLoading und isLoading.
 */
export function ChildPoints({
  childId,
  size = "md",
  showLoading = true,
  labelOnly = false,
  className,
}: ChildPointsProps) {
  const { points, isLoading } = useChildPoints(childId)

  if (showLoading && isLoading) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {labelOnly ? "… Punkte" : "…"}
      </span>
    )
  }

  if (labelOnly) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {points} Punkte
      </span>
    )
  }

  return <PointsDisplay points={points} size={size} className={className} />
}
