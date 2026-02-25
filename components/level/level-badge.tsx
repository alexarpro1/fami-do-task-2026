"use client"

import { getLevelInfo } from "@/lib/constants"
import { motion } from "framer-motion"

interface LevelBadgeProps {
  totalPointsEarned: number
  showProgress?: boolean
  size?: "sm" | "md" | "lg"
}

export function LevelBadge({ totalPointsEarned, showProgress = true, size = "md" }: LevelBadgeProps) {
  const levelInfo = getLevelInfo(totalPointsEarned)

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  const emojiSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2">
        <span className={emojiSizes[size]}>{levelInfo.emoji}</span>
        <div>
          <p className={`font-bold text-foreground ${sizeClasses[size]}`}>Level {levelInfo.level}</p>
          <p className={`text-muted-foreground ${size === "sm" ? "text-[10px]" : "text-xs"}`}>{levelInfo.title}</p>
        </div>
      </div>

      {showProgress && levelInfo.nextLevel && (
        <div className="w-full mt-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>
              {levelInfo.pointsInCurrentLevel} / {levelInfo.pointsNeededForNext}
            </span>
            <span>Level {levelInfo.nextLevel.level}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
