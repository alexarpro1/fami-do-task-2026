"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface DayPickerProps {
  selectedDays: string[]
  onDaysChange: (days: string[]) => void
  size?: "sm" | "md" | "lg"
  showLabels?: boolean
}

const DAYS = [
  { key: "mon", short: "Mo", label: "Montag" },
  { key: "tue", short: "Di", label: "Dienstag" },
  { key: "wed", short: "Mi", label: "Mittwoch" },
  { key: "thu", short: "Do", label: "Donnerstag" },
  { key: "fri", short: "Fr", label: "Freitag" },
  { key: "sat", short: "Sa", label: "Samstag" },
  { key: "sun", short: "So", label: "Sonntag" },
]

export function DayPicker({ selectedDays, onDaysChange, size = "md", showLabels = false }: DayPickerProps) {
  const days = selectedDays ?? []

  const toggleDay = (day: string) => {
    if (days.includes(day)) {
      onDaysChange(days.filter((d) => d !== day))
    } else {
      onDaysChange([...days, day])
    }
  }

  const selectAll = () => onDaysChange(DAYS.map((d) => d.key))
  const selectNone = () => onDaysChange([])
  const selectWeekdays = () => onDaysChange(["mon", "tue", "wed", "thu", "fri"])
  const selectWeekend = () => onDaysChange(["sat", "sun"])

  return (
    <div className="space-y-3">
      {/* Quick Select Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="px-3 py-1.5 text-xs rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
        >
          Alle
        </button>
        <button
          type="button"
          onClick={selectWeekdays}
          className="px-3 py-1.5 text-xs rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
        >
          Wochentage
        </button>
        <button
          type="button"
          onClick={selectWeekend}
          className="px-3 py-1.5 text-xs rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
        >
          Wochenende
        </button>
        <button
          type="button"
          onClick={selectNone}
          className="px-3 py-1.5 text-xs rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
        >
          Keine
        </button>
      </div>

      {/* Day Checkboxes */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {DAYS.map((day) => {
          const isSelected = days.includes(day.key)
          const isWeekend = day.key === "sat" || day.key === "sun"

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl transition-all",
                size === "sm"
                  ? "h-8 w-8 text-xs"
                  : size === "lg"
                    ? "h-12 w-12 md:h-14 md:w-14 text-base"
                    : "h-10 w-10 md:h-12 md:w-12 text-sm",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : isWeekend
                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              {isSelected && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
              <span className="font-semibold">{day.short}</span>
            </button>
          )
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex flex-wrap gap-1">
          {days.length === 0 ? (
            <span className="text-xs text-muted-foreground">Keine Tage ausgewaehlt</span>
          ) : days.length === 7 ? (
            <span className="text-xs text-muted-foreground">Jeden Tag</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {days
                .map((d) => DAYS.find((day) => day.key === d)?.label)
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
