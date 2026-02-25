"use client"

import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { MoodSelector } from "@/components/mood/mood-selector"
import { MoodHistory } from "@/components/mood/mood-history"
import { WeatherWidget } from "@/components/weather/weather-widget"
import Link from "next/link"

export default function MoodPage() {
  const { selectedChild, state } = useFamily()

  const settings = state?.settings ?? { moodTrackingEnabled: true, weatherEnabled: true }
  const moodEntries = state?.moodEntries ?? []

  if (!settings.moodTrackingEnabled) {
    return (
      <AppShell>
        <EmptyState
          icon="😊"
          title="Stimmungs-Tracker deaktiviert"
          description="Der Stimmungs-Tracker ist in den Einstellungen deaktiviert."
        />
      </AppShell>
    )
  }

  if (!selectedChild) {
    return (
      <AppShell>
        <EmptyState
          icon="👤"
          title="Kein Kind ausgewaehlt"
          description="Waehle zuerst ein Kind aus."
          action={
            <Link href="/">
              <Button>Zur Startseite</Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  const todayMood = moodEntries.find(
    (m) => m.childId === selectedChild.id && new Date(m.createdAt).toDateString() === new Date().toDateString(),
  )

  return (
    <AppShell>
      <div className="px-4 py-6 space-y-6">
        {/* Weather Widget */}
        {settings.weatherEnabled && <WeatherWidget />}

        {/* Mood Selector or Today's Mood */}
        {!todayMood ? (
          <MoodSelector />
        ) : (
          <div className="bg-card rounded-2xl p-6 neu-flat text-center">
            <p className="text-sm text-muted-foreground mb-2">Deine Stimmung heute:</p>
            <span className="text-5xl block mb-2">
              {todayMood.mood === "great"
                ? "🤩"
                : todayMood.mood === "good"
                  ? "😊"
                  : todayMood.mood === "okay"
                    ? "😐"
                    : todayMood.mood === "sad"
                      ? "😢"
                      : "😠"}
            </span>
            {todayMood.note && <p className="text-sm text-muted-foreground italic">"{todayMood.note}"</p>}
          </div>
        )}

        {/* Mood History */}
        <MoodHistory />
      </div>
    </AppShell>
  )
}
