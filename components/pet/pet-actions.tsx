"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Heart, Sparkles } from "lucide-react"
import type { Pet } from "@/types"

interface PetActionsProps {
  pet: Pet
}

const FOOD_OPTIONS = [
  { emoji: "🍎", name: "Apfel", health: 15 },
  { emoji: "🥕", name: "Karotte", health: 20 },
  { emoji: "🍖", name: "Leckerli", health: 30 },
  { emoji: "🍪", name: "Keks", health: 10 },
]

export function PetActions({ pet }: PetActionsProps) {
  const { dispatch } = useFamily()
  const [showFood, setShowFood] = useState(false)
  const [feedingAnimation, setFeedingAnimation] = useState<string | null>(null)

  const handleFeed = (food: (typeof FOOD_OPTIONS)[0]) => {
    setFeedingAnimation(food.emoji)
    dispatch({ type: "FEED_PET", payload: { petId: pet.id } })

    setTimeout(() => {
      setFeedingAnimation(null)
      setShowFood(false)
    }, 1000)
  }

  const handlePlay = () => {
    // Add small XP for playing
    dispatch({ type: "ADD_PET_XP", payload: { petId: pet.id, xp: 5 } })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Feeding Animation */}
      {feedingAnimation && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="text-6xl animate-bounce">{feedingAnimation}</span>
        </div>
      )}

      {/* Food Selection */}
      {showFood && (
        <div className="bg-card rounded-2xl p-4 neu-flat">
          <h4 className="text-sm font-medium mb-3 text-center">Waehle Futter:</h4>
          <div className="grid grid-cols-4 gap-2">
            {FOOD_OPTIONS.map((food) => (
              <button
                key={food.name}
                onClick={() => handleFeed(food)}
                className="flex flex-col items-center p-2 rounded-xl bg-secondary hover:bg-primary/20 transition-all hover:scale-105"
              >
                <span className="text-2xl">{food.emoji}</span>
                <span className="text-xs mt-1">{food.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button
          onClick={() => setShowFood(!showFood)}
          size="lg"
          className={cn("rounded-full px-6", pet.health < 50 && "animate-pulse")}
        >
          <Heart className="w-5 h-5 mr-2" />
          Fuettern
        </Button>

        <Button onClick={handlePlay} size="lg" variant="outline" className="rounded-full px-6 bg-transparent">
          <Sparkles className="w-5 h-5 mr-2" />
          Spielen
        </Button>
      </div>

      {/* Pet Mood Indicator */}
      <div className="flex justify-center gap-2">
        <PetMoodIndicator mood={pet.mood} />
      </div>
    </div>
  )
}

function PetMoodIndicator({ mood }: { mood: Pet["mood"] }) {
  const moodData = {
    happy: { emoji: "😊", label: "Gluecklich", color: "text-success" },
    neutral: { emoji: "😐", label: "Neutral", color: "text-warning" },
    sad: { emoji: "😢", label: "Traurig", color: "text-destructive" },
  }

  const data = moodData[mood]

  return (
    <div className={cn("flex items-center gap-2 text-sm", data.color)}>
      <span className="text-xl">{data.emoji}</span>
      <span>{data.label}</span>
    </div>
  )
}
