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
    <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide narrow:gap-2 narrow:pb-2">
      {categories.map((cat) => (
        <button
          key={cat.key}
          type="button"
          onClick={() => onChange(cat.key)}
          className={cn(
            "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full whitespace-nowrap px-3 py-1.5 text-sm transition-all narrow:min-h-10 narrow:gap-2 narrow:px-4 narrow:py-2 narrow:text-base",
            selected === cat.key
              ? "bg-primary text-primary-foreground neu-pressed"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          )}
        >
          <span className="text-base narrow:text-lg" aria-hidden>{cat.emoji}</span>
          <span className="font-medium">{cat.label}</span>
        </button>
      ))}
    </div>
  )
}
