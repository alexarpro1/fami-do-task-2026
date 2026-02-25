"use client"

import type { TaskCategory } from "@/types"
import { cn } from "@/lib/utils"

interface CategoryTabsProps {
  selected: TaskCategory | "all"
  onChange: (category: TaskCategory | "all") => void
}

const categories: { key: TaskCategory | "all"; label: string; emoji: string }[] = [
  { key: "all", label: "Alle", emoji: "📋" },
  { key: "morning", label: "Morgen", emoji: "🌅" },
  { key: "evening", label: "Abend", emoji: "🌙" },
  { key: "weekend", label: "Wochenende", emoji: "🎉" },
]

export function CategoryTabs({ selected, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all",
            selected === cat.key
              ? "bg-primary text-primary-foreground neu-pressed"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          )}
        >
          <span>{cat.emoji}</span>
          <span className="font-medium">{cat.label}</span>
        </button>
      ))}
    </div>
  )
}
