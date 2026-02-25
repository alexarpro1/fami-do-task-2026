"use client"

import { motion } from "framer-motion"
import { Lock } from "lucide-react"
import { getAchievementById, ACHIEVEMENTS } from "@/lib/constants"
import type { Achievement } from "@/types"

interface AchievementCardProps {
  achievementId: string
  unlocked: boolean
  size?: "sm" | "md"
}

export function AchievementCard({ achievementId, unlocked, size = "md" }: AchievementCardProps) {
  const achievement = getAchievementById(achievementId)
  if (!achievement) return null

  const rarityColors = {
    bronze: "from-amber-600 to-amber-800",
    silver: "from-gray-300 to-gray-500",
    gold: "from-yellow-400 to-yellow-600",
    platinum: "from-purple-400 to-pink-500",
  }

  const rarityBorder = {
    bronze: "border-amber-600",
    silver: "border-gray-400",
    gold: "border-yellow-500",
    platinum: "border-purple-500",
  }

  const sizeClasses = size === "sm" ? "w-16 h-16 text-2xl" : "w-20 h-20 text-3xl"

  return (
    <motion.div whileHover={unlocked ? { scale: 1.05 } : {}} className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses} rounded-2xl flex items-center justify-center relative overflow-hidden border-2 ${
          unlocked ? rarityBorder[achievement.rarity] : "border-muted"
        }`}
      >
        {unlocked ? (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[achievement.rarity]} opacity-20`} />
            <span>{achievement.emoji}</span>
          </>
        ) : (
          <Lock className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <span
        className={`text-xs text-center font-medium ${unlocked ? "text-foreground" : "text-muted-foreground"} line-clamp-1`}
      >
        {achievement.name}
      </span>
    </motion.div>
  )
}

interface AchievementGridProps {
  unlockedAchievements: string[]
  category?: Achievement["category"]
  showLocked?: boolean
}

export function AchievementGrid({ unlockedAchievements, category, showLocked = true }: AchievementGridProps) {
  const achievements = category ? ACHIEVEMENTS.filter((a) => a.category === category) : ACHIEVEMENTS

  const sorted = [...achievements].sort((a, b) => {
    const aUnlocked = unlockedAchievements.includes(a.id)
    const bUnlocked = unlockedAchievements.includes(b.id)
    if (aUnlocked && !bUnlocked) return -1
    if (!aUnlocked && bUnlocked) return 1
    return 0
  })

  const filtered = showLocked ? sorted : sorted.filter((a) => unlockedAchievements.includes(a.id))

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
      {filtered.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievementId={achievement.id}
          unlocked={unlockedAchievements.includes(achievement.id)}
          size="sm"
        />
      ))}
    </div>
  )
}
