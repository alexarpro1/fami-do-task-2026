"use client"

import { cn } from "@/lib/utils"
import type { Pet } from "@/types"

interface PetEvolutionDisplayProps {
  pet: Pet
  showDetails?: boolean
}

const PET_EVOLUTION_DATA = {
  cat: {
    stages: [
      { emoji: "🐱", name: "Kaetzchen", description: "Ein kleines, neugieriges Kaetzchen" },
      { emoji: "😺", name: "Junge Katze", description: "Verspielt und voller Energie" },
      { emoji: "😸", name: "Erwachsene Katze", description: "Elegant und selbstbewusst" },
      { emoji: "🐈", name: "Weise Katze", description: "Erfahren und gelassen" },
      { emoji: "🐈‍⬛", name: "Legendäre Katze", description: "Mystisch und mächtig" },
    ],
  },
  dog: {
    stages: [
      { emoji: "🐶", name: "Welpe", description: "Ein treuer kleiner Welpe" },
      { emoji: "🐕", name: "Junger Hund", description: "Energisch und verspielt" },
      { emoji: "🦮", name: "Erwachsener Hund", description: "Loyal und beschuetzend" },
      { emoji: "🐕‍🦺", name: "Weiser Hund", description: "Ein wahrer Begleiter" },
      { emoji: "🐺", name: "Legendärer Wolf", description: "Majestätisch und stark" },
    ],
  },
  bunny: {
    stages: [
      { emoji: "🐰", name: "Baby-Hase", description: "Klein und flauschig" },
      { emoji: "🐇", name: "Junger Hase", description: "Schnell und neugierig" },
      { emoji: "🐰", name: "Erwachsener Hase", description: "Geschickt und schlau" },
      { emoji: "🐇", name: "Weiser Hase", description: "Weise und geduldig" },
      { emoji: "🦊", name: "Magischer Fuchs", description: "Mystisch verwandelt" },
    ],
  },
  dragon: {
    stages: [
      { emoji: "🐉", name: "Drachen-Ei", description: "Ein mystisches Drachen-Ei" },
      { emoji: "🐲", name: "Baby-Drache", description: "Klein aber feurig" },
      { emoji: "🔥", name: "Junger Drache", description: "Lernt Feuer zu speien" },
      { emoji: "🌟", name: "Erwachsener Drache", description: "Maechtig und weise" },
      { emoji: "🐉", name: "Ur-Drache", description: "Der mächtigste aller Drachen" },
    ],
  },
  unicorn: {
    stages: [
      { emoji: "🦄", name: "Baby-Einhorn", description: "Ein magisches Fohlein" },
      { emoji: "🌈", name: "Junges Einhorn", description: "Hinterlaesst Regenboegen" },
      { emoji: "✨", name: "Erwachsenes Einhorn", description: "Voller Sternenstaub" },
      { emoji: "💫", name: "Kosmisches Einhorn", description: "Zwischen den Sternen wandelnd" },
      { emoji: "🦄", name: "Regenbogen-Einhorn", description: "Das seltenste aller Einhoerner" },
    ],
  },
}

export function PetEvolutionDisplay({ pet, showDetails = false }: PetEvolutionDisplayProps) {
  const evolutionData = PET_EVOLUTION_DATA[pet.type]
  const currentStage = evolutionData.stages[pet.evolutionStage - 1]

  return (
    <div className="flex flex-col items-center">
      {/* Evolution Timeline */}
      <div className="flex items-center gap-2 mb-4">
        {evolutionData.stages.map((stage, index) => {
          const stageNum = index + 1
          const isUnlocked = stageNum <= pet.evolutionStage
          const isCurrent = stageNum === pet.evolutionStage

          return (
            <div key={index} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all",
                  isUnlocked ? "bg-card neu-flat" : "bg-muted/50 grayscale opacity-50",
                  isCurrent && "ring-2 ring-primary ring-offset-2 scale-110",
                )}
              >
                {stage.emoji}
              </div>
              {index < evolutionData.stages.length - 1 && (
                <div className={cn("w-4 h-1 mx-1", isUnlocked ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          )
        })}
      </div>

      {/* Current Stage Info */}
      {showDetails && currentStage && (
        <div className="text-center">
          <h4 className="font-[var(--font-fredoka)] font-bold">{currentStage.name}</h4>
          <p className="text-sm text-muted-foreground">{currentStage.description}</p>
        </div>
      )}
    </div>
  )
}
