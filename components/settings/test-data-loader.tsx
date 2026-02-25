"use client"

import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { Upload, Trash2 } from "lucide-react"
import type { FamilyState } from "@/types"
import { DEFAULT_SETTINGS } from "@/lib/constants"

export function TestDataLoader() {
  const { dispatch } = useFamily()

  const loadTestData = () => {
    if (!confirm("Alle aktuellen Daten werden durch Testdaten ersetzt. Fortfahren?")) {
      return
    }

    const testData: FamilyState = {
      children: [
        {
          id: "child-1",
          name: "Emma",
          age: 8,
          avatar: "👧",
          color: "#FF6B9D",
          points: 450,
          totalPointsEarned: 1250,
          createdAt: new Date().toISOString(),
        },
        {
          id: "child-2",
          name: "Max",
          age: 6,
          avatar: "👦",
          color: "#4ECDC4",
          points: 320,
          totalPointsEarned: 890,
          createdAt: new Date().toISOString(),
        },
      ],
      tasks: [
        {
          id: "task-1",
          title: "Zaehne putzen",
          emoji: "🪥",
          points: 5,
          category: "morning",
          difficulty: "easy",
          days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
          isActive: true,
          order: 0,
        },
        {
          id: "task-2",
          title: "Bett machen",
          emoji: "🛏️",
          points: 5,
          category: "morning",
          difficulty: "easy",
          days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
          isActive: true,
          order: 1,
        },
        {
          id: "task-3",
          title: "Zimmer aufraeumen",
          emoji: "🧹",
          points: 10,
          category: "morning",
          difficulty: "medium",
          days: ["mon", "wed", "fri"],
          isActive: true,
          order: 2,
        },
        {
          id: "task-4",
          title: "Hausaufgaben",
          emoji: "📚",
          points: 15,
          category: "evening",
          difficulty: "medium",
          days: ["mon", "tue", "wed", "thu", "fri"],
          isActive: true,
          order: 3,
        },
        {
          id: "task-5",
          title: "Lesen (15 Min)",
          emoji: "📖",
          points: 10,
          category: "evening",
          difficulty: "easy",
          days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
          isActive: true,
          order: 4,
          duration: 15,
        },
        {
          id: "task-6",
          title: "Spielsachen aufraeumen",
          emoji: "🧸",
          points: 10,
          category: "weekend",
          difficulty: "medium",
          days: ["sat", "sun"],
          isActive: true,
          order: 5,
        },
      ],
      taskCompletions: [
        {
          id: "tc-1",
          taskId: "task-1",
          childId: "child-1",
          completedAt: new Date().toISOString(),
          pointsEarned: 5,
          withTimer: false,
        },
        {
          id: "tc-2",
          taskId: "task-2",
          childId: "child-1",
          completedAt: new Date().toISOString(),
          pointsEarned: 5,
          withTimer: false,
        },
      ],
      rewards: [
        { id: "reward-1", name: "Extra Bildschirmzeit", emoji: "📱", cost: 50, category: "privilege", isActive: true },
        { id: "reward-2", name: "Lieblings-Essen", emoji: "🍕", cost: 100, category: "experience", isActive: true },
        { id: "reward-3", name: "Spielzeug auswählen", emoji: "🎁", cost: 200, category: "item", isActive: true },
        { id: "reward-4", name: "Freizeitpark", emoji: "🎢", cost: 500, category: "special", isActive: true },
      ],
      rewardRedemptions: [],
      rules: [
        {
          id: "rule-1",
          title: "Geholfen ohne Aufforderung",
          emoji: "🤝",
          points: 10,
          isPositive: true,
          category: "behavior",
          isActive: true,
        },
        {
          id: "rule-2",
          title: "Freundlich zu Geschwistern",
          emoji: "❤️",
          points: 5,
          isPositive: true,
          category: "social",
          isActive: true,
        },
        {
          id: "rule-3",
          title: "Nicht gehoert",
          emoji: "🙉",
          points: -10,
          isPositive: false,
          category: "behavior",
          isActive: true,
          dailyLimit: 3,
        },
        {
          id: "rule-4",
          title: "Streit angefangen",
          emoji: "😠",
          points: -15,
          isPositive: false,
          category: "social",
          isActive: true,
        },
      ],
      ruleApplications: [],
      pets: [
        {
          id: "pet-1",
          childId: "child-1",
          name: "Fluffy",
          type: "cat",
          level: 3,
          xp: 120,
          xpToNextLevel: 150,
          mood: "happy",
          health: 85,
          lastFed: new Date().toISOString(),
          evolutionStage: 2,
        },
        {
          id: "pet-2",
          childId: "child-2",
          name: "Buddy",
          type: "dog",
          level: 2,
          xp: 45,
          xpToNextLevel: 100,
          mood: "neutral",
          health: 70,
          lastFed: new Date(Date.now() - 3600000).toISOString(),
          evolutionStage: 1,
        },
      ],
      stickerCollections: [
        { childId: "child-1", stickers: ["star-gold", "rainbow", "rocket", "heart", "trophy"] },
        { childId: "child-2", stickers: ["star-gold", "rainbow", "crown"] },
      ],
      settings: {
        ...DEFAULT_SETTINGS,
        petSystemEnabled: true,
        stickerSystemEnabled: true,
        weatherEnabled: true,
        moodTrackingEnabled: true,
      },
      selectedChildId: "child-1",
      lastUpdated: new Date().toISOString(),
      moodEntries: [
        { id: "mood-1", childId: "child-1", mood: "great", createdAt: new Date().toISOString() },
        { id: "mood-2", childId: "child-2", mood: "good", createdAt: new Date().toISOString() },
      ],
      weather: {
        temperature: 18,
        condition: "sunny",
        clothingTip: "T-Shirt und leichte Hose",
        lastUpdated: new Date().toISOString(),
      },
      schoolTimes: [
        {
          childId: "child-1",
          enabled: true,
          days: ["mon", "tue", "wed", "thu", "fri"],
          startTime: "08:00",
          endTime: "13:00",
        },
      ],
    }

    dispatch({ type: "LOAD_STATE", payload: testData })
    alert("Testdaten wurden geladen!")
  }

  const resetAllData = () => {
    if (!confirm("ACHTUNG: Alle Daten werden unwiderruflich geloescht. Fortfahren?")) {
      return
    }
    dispatch({ type: "RESET_STATE" })
    alert("Alle Daten wurden zurueckgesetzt!")
  }

  return (
    <div className="flex gap-3">
      <Button onClick={loadTestData} variant="outline" className="flex-1 gap-2 bg-transparent rounded-xl">
        <Upload className="w-4 h-4" />
        Testdaten
      </Button>
      <Button onClick={resetAllData} variant="destructive" className="flex-1 gap-2 rounded-xl">
        <Trash2 className="w-4 h-4" />
        Reset
      </Button>
    </div>
  )
}
