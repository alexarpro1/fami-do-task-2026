"use client"

import { cn } from "@/lib/utils"
import type { Sticker } from "@/types"

interface StickerCardProps {
  sticker: Sticker & { unlockedAt?: string }
  isUnlocked: boolean
  size?: "sm" | "md" | "lg"
  showRarity?: boolean
  onClick?: () => void
}

const RARITY_COLORS = {
  common: "from-gray-200 to-gray-300 border-gray-300",
  rare: "from-blue-200 to-blue-400 border-blue-400",
  epic: "from-purple-200 to-purple-500 border-purple-500",
  legendary: "from-yellow-200 via-orange-300 to-yellow-500 border-yellow-500",
}

const RARITY_LABELS = {
  common: "Gewoehnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendaer",
}

const SIZE_CLASSES = {
  sm: "w-14 h-14 text-2xl",
  md: "w-20 h-20 text-4xl",
  lg: "w-28 h-28 text-6xl",
}

export function StickerCard({ sticker, isUnlocked, size = "md", showRarity = true, onClick }: StickerCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!isUnlocked}
      className={cn(
        "relative rounded-xl transition-all duration-300",
        SIZE_CLASSES[size],
        "flex items-center justify-center",
        isUnlocked
          ? cn("bg-gradient-to-br", RARITY_COLORS[sticker.rarity], "border-2 shadow-lg hover:scale-110 animate-float")
          : "bg-muted/50 border-2 border-dashed border-muted-foreground/30",
        onClick && isUnlocked && "cursor-pointer",
      )}
    >
      {isUnlocked ? (
        <>
          <span className="drop-shadow-md">{sticker.emoji}</span>
          {showRarity && sticker.rarity !== "common" && (
            <span
              className={cn(
                "absolute -top-1 -right-1 w-4 h-4 rounded-full",
                sticker.rarity === "rare" && "bg-blue-500",
                sticker.rarity === "epic" && "bg-purple-500",
                sticker.rarity === "legendary" && "bg-yellow-500 animate-pulse",
              )}
            />
          )}
        </>
      ) : (
        <span className="text-muted-foreground/50">?</span>
      )}
    </button>
  )
}

export function StickerDetails({
  sticker,
  isUnlocked,
}: {
  sticker: Sticker & { unlockedAt?: string }
  isUnlocked: boolean
}) {
  return (
    <div className="flex flex-col items-center p-4 bg-card rounded-2xl neu-flat">
      <StickerCard sticker={sticker} isUnlocked={isUnlocked} size="lg" showRarity={false} />
      <h3 className="font-[var(--font-fredoka)] text-lg font-bold mt-3">{isUnlocked ? sticker.name : "???"}</h3>
      <span
        className={cn(
          "text-xs px-2 py-0.5 rounded-full mt-1",
          sticker.rarity === "common" && "bg-gray-200 text-gray-700",
          sticker.rarity === "rare" && "bg-blue-200 text-blue-700",
          sticker.rarity === "epic" && "bg-purple-200 text-purple-700",
          sticker.rarity === "legendary" && "bg-yellow-200 text-yellow-700",
        )}
      >
        {RARITY_LABELS[sticker.rarity]}
      </span>
      {isUnlocked && sticker.unlockedAt && (
        <p className="text-xs text-muted-foreground mt-2">
          Freigeschaltet: {new Date(sticker.unlockedAt).toLocaleDateString("de-DE")}
        </p>
      )}
    </div>
  )
}
