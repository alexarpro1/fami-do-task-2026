"use client"

import { Flame } from "lucide-react"
import { motion } from "framer-motion"

interface StreakBadgeProps {
  currentStreak: number
  longestStreak: number
  size?: "sm" | "md" | "lg"
}

export function StreakBadge({ currentStreak, longestStreak, size = "md" }: StreakBadgeProps) {
  const sizeClasses = {
    sm: "text-sm gap-1 px-2 py-1",
    md: "text-base gap-2 px-3 py-2",
    lg: "text-lg gap-3 px-4 py-3",
  }

  const iconSize = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  const getStreakColor = () => {
    if (currentStreak >= 30) return "text-purple-500"
    if (currentStreak >= 14) return "text-yellow-500"
    if (currentStreak >= 7) return "text-orange-500"
    if (currentStreak >= 3) return "text-red-500"
    return "text-muted-foreground"
  }

  const getStreakBg = () => {
    if (currentStreak >= 30) return "bg-purple-500/10"
    if (currentStreak >= 14) return "bg-yellow-500/10"
    if (currentStreak >= 7) return "bg-orange-500/10"
    if (currentStreak >= 3) return "bg-red-500/10"
    return "bg-secondary"
  }

  return (
    <div className={`flex items-center ${sizeClasses[size]} ${getStreakBg()} rounded-full`}>
      <motion.div
        animate={currentStreak > 0 ? { scale: [1, 1.2, 1] } : {}}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
      >
        <Flame className={`${iconSize[size]} ${getStreakColor()}`} />
      </motion.div>
      <div className="flex flex-col">
        <span className={`font-bold ${getStreakColor()}`}>
          {currentStreak} {currentStreak === 1 ? "Tag" : "Tage"}
        </span>
        {size !== "sm" && longestStreak > 0 && (
          <span className="text-xs text-muted-foreground">Rekord: {longestStreak} Tage</span>
        )}
      </div>
    </div>
  )
}
