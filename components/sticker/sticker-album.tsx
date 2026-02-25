"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { DEFAULT_STICKERS } from "@/lib/constants"
import { StickerCard, StickerDetails } from "./sticker-card"
import { cn } from "@/lib/utils"
import { X, Sparkles, Lock } from "lucide-react"
import type { Sticker } from "@/types"

const CATEGORIES = [
  { id: "all", label: "Alle", emoji: "🎯" },
  { id: "achievement", label: "Erfolge", emoji: "🏆" },
  { id: "emotion", label: "Emotionen", emoji: "😊" },
  { id: "nature", label: "Natur", emoji: "🌿" },
  { id: "fantasy", label: "Fantasy", emoji: "🦄" },
  { id: "adventure", label: "Abenteuer", emoji: "🚀" },
]

export function StickerAlbum() {
  const { selectedChild, state } = useFamily()
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSticker, setSelectedSticker] = useState<(Sticker & { unlockedAt?: string }) | null>(null)

  if (!selectedChild) return null

  const collection = state.stickerCollections.find((sc) => sc.childId === selectedChild.id)
  const unlockedIds = collection?.stickers || []

  const stickers = DEFAULT_STICKERS.map((s) => ({
    ...s,
    unlockedAt: unlockedIds.includes(s.id) ? new Date().toISOString() : undefined,
  }))

  const filteredStickers =
    selectedCategory === "all" ? stickers : stickers.filter((s) => s.category === selectedCategory)

  const totalStickers = DEFAULT_STICKERS.length
  const unlockedCount = unlockedIds.length
  const progress = (unlockedCount / totalStickers) * 100

  const rarityStats = {
    common: DEFAULT_STICKERS.filter((s) => s.rarity === "common").length,
    rare: DEFAULT_STICKERS.filter((s) => s.rarity === "rare").length,
    epic: DEFAULT_STICKERS.filter((s) => s.rarity === "epic").length,
    legendary: DEFAULT_STICKERS.filter((s) => s.rarity === "legendary").length,
  }

  const unlockedByRarity = {
    common: stickers.filter((s) => s.rarity === "common" && unlockedIds.includes(s.id)).length,
    rare: stickers.filter((s) => s.rarity === "rare" && unlockedIds.includes(s.id)).length,
    epic: stickers.filter((s) => s.rarity === "epic" && unlockedIds.includes(s.id)).length,
    legendary: stickers.filter((s) => s.rarity === "legendary" && unlockedIds.includes(s.id)).length,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress Header */}
      <div className="bg-card rounded-2xl p-4 neu-flat">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="font-[var(--font-fredoka)] font-bold">Sticker-Album</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {unlockedCount} / {totalStickers}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-secondary rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Rarity Stats */}
        <div className="grid grid-cols-4 gap-2">
          {(["common", "rare", "epic", "legendary"] as const).map((rarity) => (
            <div
              key={rarity}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg text-xs",
                rarity === "common" && "bg-gray-100",
                rarity === "rare" && "bg-blue-100",
                rarity === "epic" && "bg-purple-100",
                rarity === "legendary" && "bg-yellow-100",
              )}
            >
              <span className="font-bold">
                {unlockedByRarity[rarity]}/{rarityStats[rarity]}
              </span>
              <span className="text-muted-foreground capitalize">
                {rarity === "common"
                  ? "Normal"
                  : rarity === "rare"
                    ? "Selten"
                    : rarity === "epic"
                      ? "Episch"
                      : "Legend."}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-all",
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-card neu-flat hover:bg-secondary",
            )}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Sticker Grid */}
      <div className="grid grid-cols-4 gap-3">
        {filteredStickers.map((sticker) => {
          const isUnlocked = unlockedIds.includes(sticker.id)
          return (
            <StickerCard
              key={sticker.id}
              sticker={sticker}
              isUnlocked={isUnlocked}
              size="md"
              onClick={() => setSelectedSticker(sticker)}
            />
          )
        })}
      </div>

      {/* Milestone Hints */}
      <div className="bg-card rounded-2xl p-4 neu-flat">
        <h3 className="font-[var(--font-fredoka)] font-bold mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Meilensteine
        </h3>
        <div className="space-y-2 text-sm">
          <MilestoneItem icon="⭐" label="5 Aufgaben erledigt" unlocked={unlockedCount >= 1} />
          <MilestoneItem icon="🔥" label="7-Tage Streak" unlocked={unlockedCount >= 3} />
          <MilestoneItem icon="🏆" label="100 Punkte gesammelt" unlocked={unlockedCount >= 5} />
          <MilestoneItem
            icon="🦄"
            label="Alle normalen Sticker"
            unlocked={unlockedByRarity.common === rarityStats.common}
          />
          <MilestoneItem icon="🌟" label="Album komplett" unlocked={unlockedCount === totalStickers} />
        </div>
      </div>

      {/* Sticker Detail Modal */}
      {selectedSticker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl p-6 max-w-xs w-full relative">
            <button
              onClick={() => setSelectedSticker(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
            <StickerDetails sticker={selectedSticker} isUnlocked={unlockedIds.includes(selectedSticker.id)} />
          </div>
        </div>
      )}
    </div>
  )
}

function MilestoneItem({
  icon,
  label,
  unlocked,
}: {
  icon: string
  label: string
  unlocked: boolean
}) {
  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-lg", unlocked ? "bg-success/20" : "bg-muted/50")}>
      <span className={cn("text-lg", !unlocked && "grayscale opacity-50")}>{icon}</span>
      <span className={cn(!unlocked && "text-muted-foreground")}>{label}</span>
      {unlocked && <span className="ml-auto text-success">✓</span>}
    </div>
  )
}
