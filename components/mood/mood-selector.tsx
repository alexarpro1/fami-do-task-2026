"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { MoodEntry } from "@/types"

const MOODS: {
  value: MoodEntry["mood"]
  emoji: string
  label: string
  lightColor: string
  darkColor: string
  description: string
}[] = [
  {
    value: "great",
    emoji: "🤩",
    label: "Super",
    lightColor: "bg-emerald-100 border-emerald-400 text-emerald-700",
    darkColor: "dark:bg-emerald-900/40 dark:border-emerald-600 dark:text-emerald-300",
    description: "Ich fuehle mich fantastisch!",
  },
  {
    value: "good",
    emoji: "😊",
    label: "Gut",
    lightColor: "bg-sky-100 border-sky-400 text-sky-700",
    darkColor: "dark:bg-sky-900/40 dark:border-sky-600 dark:text-sky-300",
    description: "Mir geht es gut",
  },
  {
    value: "okay",
    emoji: "😐",
    label: "Okay",
    lightColor: "bg-amber-100 border-amber-400 text-amber-700",
    darkColor: "dark:bg-amber-900/40 dark:border-amber-600 dark:text-amber-300",
    description: "Es geht so",
  },
  {
    value: "sad",
    emoji: "😢",
    label: "Traurig",
    lightColor: "bg-violet-100 border-violet-400 text-violet-700",
    darkColor: "dark:bg-violet-900/40 dark:border-violet-600 dark:text-violet-300",
    description: "Ich bin traurig",
  },
  {
    value: "angry",
    emoji: "😠",
    label: "Wuetend",
    lightColor: "bg-rose-100 border-rose-400 text-rose-700",
    darkColor: "dark:bg-rose-900/40 dark:border-rose-600 dark:text-rose-300",
    description: "Ich bin wuetend",
  },
]

interface MoodSelectorProps {
  childId?: string
  compact?: boolean
  onComplete?: () => void
}

export function MoodSelector({ childId, compact = false, onComplete }: MoodSelectorProps) {
  const { selectedChild, state, dispatch } = useFamily()
  const [selectedMood, setSelectedMood] = useState<MoodEntry["mood"] | null>(null)
  const [note, setNote] = useState("")
  const [step, setStep] = useState<"select" | "note">("select")
  const [saved, setSaved] = useState(false)

  const children = state?.children ?? []
  const moodEntries = state?.moodEntries ?? []

  const targetChildId = childId || selectedChild?.id
  const child = children.find((c) => c.id === targetChildId)

  if (!child) return null

  // Check if mood already logged today
  const today = new Date().toDateString()
  const todayMood = moodEntries.find(
    (m) => m.childId === targetChildId && new Date(m.createdAt).toDateString() === today,
  )

  if (compact) {
    if (todayMood || saved) {
      const mood = MOODS.find((m) => m.value === (todayMood?.mood || selectedMood))
      return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
          <span className="text-3xl md:text-4xl">{mood?.emoji}</span>
          <div>
            <span className="text-sm font-medium text-foreground">Heute: {mood?.label}</span>
            <p className="text-xs text-muted-foreground">{mood?.description}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-5 gap-2 md:gap-3">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            onClick={() => {
              if (!targetChildId) return
              dispatch({
                type: "ADD_MOOD",
                payload: { childId: targetChildId, mood: mood.value },
              })
              setSaved(true)
              onComplete?.()
            }}
            className={cn(
              "flex flex-col items-center p-3 md:p-4 rounded-xl border-2 transition-all",
              "hover:scale-105 active:scale-95 touch-manipulation",
              mood.lightColor,
              mood.darkColor,
            )}
          >
            <span className="text-2xl md:text-3xl">{mood.emoji}</span>
            <span className="text-xs md:text-sm mt-1 font-medium">{mood.label}</span>
          </button>
        ))}
      </div>
    )
  }

  const handleMoodSelect = (mood: MoodEntry["mood"]) => {
    setSelectedMood(mood)
    setStep("note")
  }

  const handleSubmit = () => {
    if (!selectedMood || !targetChildId) return

    dispatch({
      type: "ADD_MOOD",
      payload: {
        childId: targetChildId,
        mood: selectedMood,
        note: note.trim() || undefined,
      },
    })

    setSelectedMood(null)
    setNote("")
    setStep("select")
    setSaved(true)
    onComplete?.()
  }

  const handleSkipNote = () => {
    if (!selectedMood || !targetChildId) return

    dispatch({
      type: "ADD_MOOD",
      payload: {
        childId: targetChildId,
        mood: selectedMood,
      },
    })

    setSelectedMood(null)
    setNote("")
    setStep("select")
    setSaved(true)
    onComplete?.()
  }

  if (todayMood || saved) {
    const mood = MOODS.find((m) => m.value === (todayMood?.mood || selectedMood))
    return (
      <div className={cn("rounded-2xl p-6 md:p-8 neu-flat text-center", mood?.lightColor, mood?.darkColor)}>
        <span className="text-6xl md:text-7xl block mb-4">{mood?.emoji}</span>
        <h3 className="font-[var(--font-display)] text-xl md:text-2xl font-bold mb-2">
          Du fuehlst dich {mood?.label.toLowerCase()}
        </h3>
        <p className="text-sm md:text-base text-muted-foreground">{mood?.description}</p>
        <p className="text-xs text-muted-foreground mt-2">Stimmung fuer heute gespeichert</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl p-6 md:p-8 neu-flat">
      {step === "select" ? (
        <>
          <h3 className="font-[var(--font-display)] text-xl md:text-2xl font-bold text-center mb-2">
            Wie geht es dir heute, {child.name}?
          </h3>
          <p className="text-sm md:text-base text-muted-foreground text-center mb-6 md:mb-8">
            Tippe auf deine Stimmung
          </p>

          <div className="grid grid-cols-5 gap-2 md:gap-4">
            {MOODS.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood.value)}
                className={cn(
                  "flex flex-col items-center p-3 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all",
                  "hover:scale-105 active:scale-95 touch-manipulation",
                  mood.lightColor,
                  mood.darkColor,
                )}
              >
                <span className="text-3xl md:text-5xl">{mood.emoji}</span>
                <span className="text-xs md:text-sm mt-2 font-semibold">{mood.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setStep("select")}
              className={cn(
                "text-4xl md:text-5xl p-3 rounded-xl border-2",
                MOODS.find((m) => m.value === selectedMood)?.lightColor,
                MOODS.find((m) => m.value === selectedMood)?.darkColor,
              )}
            >
              {MOODS.find((m) => m.value === selectedMood)?.emoji}
            </button>
            <div>
              <h3 className="font-[var(--font-display)] text-lg md:text-xl font-bold">
                Du fuehlst dich {MOODS.find((m) => m.value === selectedMood)?.label.toLowerCase()}
              </h3>
              <p className="text-sm text-muted-foreground">Moechtest du mehr erzaehlen?</p>
            </div>
          </div>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Was ist passiert? (optional)"
            className="mb-4 rounded-xl resize-none text-base md:text-lg p-4"
            rows={4}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkipNote}
              className="flex-1 rounded-xl h-12 md:h-14 text-base bg-transparent"
            >
              Ueberspringen
            </Button>
            <Button onClick={handleSubmit} className="flex-1 rounded-xl h-12 md:h-14 text-base">
              Speichern
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
