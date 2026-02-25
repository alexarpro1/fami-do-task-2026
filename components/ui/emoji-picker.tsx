"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  size?: "sm" | "md" | "lg"
}

const EMOJI_CATEGORIES = {
  recent: {
    label: "Zuletzt",
    icon: "🕐",
    emojis: ["⭐", "✅", "🎯", "💪", "🌟", "🎉", "👍", "❤️"],
  },
  tasks: {
    label: "Aufgaben",
    icon: "📋",
    emojis: ["🦷", "🛁", "🧹", "🍽️", "📚", "✏️", "🎒", "👕", "🛏️", "🧸", "🎮", "📱", "💻", "🎨", "🎵", "⚽", "🚴", "🧘"],
  },
  animals: {
    label: "Tiere",
    icon: "🐾",
    emojis: [
      "🐱",
      "🐶",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🦁",
      "🐯",
      "🦄",
      "🐲",
      "🦋",
      "🐝",
      "🐢",
      "🐠",
      "🦜",
      "🦩",
      "🐨",
      "🐷",
    ],
  },
  food: {
    label: "Essen",
    icon: "🍕",
    emojis: [
      "🍎",
      "🍌",
      "🥕",
      "🥦",
      "🍕",
      "🍔",
      "🍦",
      "🍪",
      "🧁",
      "🎂",
      "🍩",
      "🥤",
      "☕",
      "🧃",
      "🥛",
      "🍫",
      "🍭",
      "🍿",
    ],
  },
  nature: {
    label: "Natur",
    icon: "🌿",
    emojis: ["🌸", "🌻", "🌈", "⭐", "🌙", "☀️", "🌤️", "🌧️", "❄️", "🍀", "🌲", "🌴", "🌵", "🔥", "💧", "🌊", "⛰️", "🏔️"],
  },
  objects: {
    label: "Objekte",
    icon: "🎁",
    emojis: ["🎁", "🏆", "🎖️", "🥇", "💎", "👑", "🎈", "🎉", "🎊", "✨", "💫", "⚡", "🔔", "🎵", "💝", "📦", "🎀", "🪄"],
  },
  faces: {
    label: "Gesichter",
    icon: "😊",
    emojis: [
      "😊",
      "😄",
      "🥰",
      "😍",
      "🤩",
      "😎",
      "🤗",
      "😇",
      "🥳",
      "😴",
      "🤔",
      "😢",
      "😠",
      "😱",
      "🙄",
      "😬",
      "🤢",
      "🤒",
    ],
  },
  symbols: {
    label: "Symbole",
    icon: "💯",
    emojis: ["✅", "❌", "⭕", "❗", "❓", "💯", "💪", "👍", "👎", "👏", "🙌", "🤝", "✋", "👋", "🎯", "🔥", "💥", "❤️"],
  },
}

export function EmojiPicker({ value, onChange, size = "md" }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>("tasks")
  const [searchQuery, setSearchQuery] = useState("")

  const sizeClasses = {
    sm: "h-10 w-10 text-xl",
    md: "h-14 w-14 text-3xl",
    lg: "h-20 w-20 text-5xl",
  }

  const emojiButtonSize = {
    sm: "h-8 w-8 text-lg",
    md: "h-10 w-10 text-2xl",
    lg: "h-12 w-12 text-3xl",
  }

  // Filter emojis based on search
  const filteredEmojis = searchQuery
    ? Object.values(EMOJI_CATEGORIES).flatMap((cat) => cat.emojis.filter((e) => e.includes(searchQuery)))
    : EMOJI_CATEGORIES[activeCategory].emojis

  return (
    <div className="relative">
      {/* Selected Emoji Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center rounded-2xl transition-all",
          "bg-secondary hover:bg-secondary/80 hover:scale-105 active:scale-95",
          "border-2 border-dashed border-muted-foreground/30",
          sizeClasses[size],
        )}
      >
        {value || "➕"}
      </button>

      {/* Emoji Picker Popup */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Picker Panel */}
          <div className="absolute z-50 top-full mt-2 left-0 w-[320px] md:w-[400px] bg-card rounded-2xl shadow-xl border border-border animate-in zoom-in-95 slide-in-from-top-2">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="font-semibold">Emoji auswählen</span>
              <button type="button" onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Emoji suchen..."
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>

            {/* Category Tabs */}
            {!searchQuery && (
              <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
                {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key as keyof typeof EMOJI_CATEGORIES)}
                    className={cn(
                      "flex flex-col items-center px-2 py-1 rounded-lg transition-all min-w-[48px]",
                      activeCategory === key ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                    )}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-[10px]">{cat.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Emoji Grid */}
            <div className="p-3 max-h-[300px] overflow-y-auto">
              <div className="grid grid-cols-6 md:grid-cols-8 gap-1">
                {filteredEmojis.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={() => {
                      onChange(emoji)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "flex items-center justify-center rounded-lg transition-all",
                      "hover:bg-secondary hover:scale-110 active:scale-95",
                      value === emoji && "bg-primary/20 ring-2 ring-primary",
                      emojiButtonSize[size],
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {filteredEmojis.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Kein Emoji gefunden</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
