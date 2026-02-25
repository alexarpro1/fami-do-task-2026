"use client"

import { cn } from "@/lib/utils"
import { Heart, AlertTriangle } from "lucide-react"

interface PetHealthBarProps {
  health: number
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function PetHealthBar({ health, showLabel = true, size = "md" }: PetHealthBarProps) {
  const getHealthColor = () => {
    if (health > 70) return "bg-success"
    if (health > 40) return "bg-warning"
    return "bg-destructive"
  }

  const getHealthStatus = () => {
    if (health > 70) return { label: "Gesund", icon: Heart }
    if (health > 40) return { label: "Hungrig", icon: AlertTriangle }
    return { label: "Sehr hungrig!", icon: AlertTriangle }
  }

  const status = getHealthStatus()

  const heightClass = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }[size]

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="flex items-center gap-1 text-muted-foreground">
            <status.icon
              className={cn(
                "w-4 h-4",
                health > 70 ? "text-success" : health > 40 ? "text-warning" : "text-destructive",
              )}
            />
            {status.label}
          </span>
          <span className="font-medium">{health}%</span>
        </div>
      )}
      <div className={cn("bg-secondary rounded-full overflow-hidden", heightClass)}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            getHealthColor(),
            health <= 40 && "animate-pulse",
          )}
          style={{ width: `${health}%` }}
        />
      </div>
    </div>
  )
}
