"use client"

import { useFamily } from "@/context/family-context"
import { cn } from "@/lib/utils"
import type { MoodEntry } from "@/types"

const MOOD_EMOJIS: Record<MoodEntry["mood"], string> = {
  great: "🤩",
  good: "😊",
  okay: "😐",
  sad: "😢",
  angry: "😠",
}

export function MoodHistory() {
  const { selectedChild, state } = useFamily()

  if (!selectedChild) return null

  const moodEntries = state.moodEntries || []

  // Get last 7 days of mood entries
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toDateString()
  }).reverse()

  const moodsByDate = last7Days.map((dateStr) => {
    const entry = moodEntries.find(
      (m) => m.childId === selectedChild.id && new Date(m.createdAt).toDateString() === dateStr,
    )
    return {
      date: dateStr,
      mood: entry?.mood,
      note: entry?.note,
    }
  })

  const dayLabels = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

  return (
    <div className="bg-card rounded-2xl p-4 neu-flat">
      <h3 className="font-[var(--font-fredoka)] font-bold mb-4">Stimmungsverlauf</h3>

      <div className="flex justify-between">
        {moodsByDate.map((day, index) => {
          const date = new Date(day.date)
          const dayLabel = dayLabels[date.getDay()]
          const isToday = day.date === new Date().toDateString()

          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <span className={cn("text-xs", isToday ? "font-bold text-primary" : "text-muted-foreground")}>
                {dayLabel}
              </span>
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                  day.mood ? "bg-secondary" : "bg-muted/50 border-2 border-dashed border-muted-foreground/30",
                  isToday && !day.mood && "ring-2 ring-primary ring-offset-2",
                )}
              >
                {day.mood ? MOOD_EMOJIS[day.mood] : "?"}
              </div>
            </div>
          )
        })}
      </div>

      {/* Today's prompt if no mood recorded */}
      {!moodsByDate.find((d) => d.date === new Date().toDateString())?.mood && (
        <p className="text-sm text-muted-foreground text-center mt-4">Du hast heute noch keine Stimmung eingetragen.</p>
      )}
    </div>
  )
}
