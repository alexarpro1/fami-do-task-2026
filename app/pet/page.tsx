"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { PetEvolutionDisplay } from "@/components/pet/pet-evolution-display"
import { PetHealthBar } from "@/components/pet/pet-health-bar"
import { PetActions } from "@/components/pet/pet-actions"
import type { Pet } from "@/types"

const PET_TYPES = [
  { type: "cat", emoji: "🐱", name: "Katze" },
  { type: "dog", emoji: "🐶", name: "Hund" },
  { type: "bunny", emoji: "🐰", name: "Hase" },
  { type: "dragon", emoji: "🐉", name: "Drache" },
  { type: "unicorn", emoji: "🦄", name: "Einhorn" },
] as const

const EVOLUTION_EMOJIS: Record<Pet["type"], string[]> = {
  cat: ["🐱", "😺", "😸", "🐈", "🐈‍⬛"],
  dog: ["🐶", "🐕", "🦮", "🐕‍🦺", "🐺"],
  bunny: ["🐰", "🐇", "🐰", "🐇", "🦊"],
  dragon: ["🐉", "🐲", "🔥", "🌟", "🐉"],
  unicorn: ["🦄", "🌈", "✨", "💫", "🦄"],
}

export default function PetPage() {
  const { selectedChild, state, dispatch } = useFamily()
  const [showCreate, setShowCreate] = useState(false)
  const [petName, setPetName] = useState("")
  const [selectedType, setSelectedType] = useState<Pet["type"]>("cat")

  if (!state.settings.petSystemEnabled) {
    return (
      <AppShell>
        <EmptyState
          icon="🐾"
          title="Haustier-System deaktiviert"
          description="Das Haustier-System ist in den Einstellungen deaktiviert."
        />
      </AppShell>
    )
  }

  if (!selectedChild) {
    return (
      <AppShell>
        <EmptyState
          icon="👤"
          title="Kein Kind ausgewählt"
          description="Wähle zuerst ein Kind aus."
          action={
            <Link href="/">
              <Button>Zur Startseite</Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  const pet = state.pets.find((p) => p.childId === selectedChild.id)

  const handleCreatePet = () => {
    if (!petName.trim()) return

    dispatch({
      type: "CREATE_PET",
      payload: {
        childId: selectedChild.id,
        name: petName.trim(),
        type: selectedType,
      },
    })

    setPetName("")
    setShowCreate(false)
  }

  // No pet yet - show creation
  if (!pet) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          {!showCreate ? (
            <EmptyState
              icon="🐣"
              title="Kein Haustier"
              description="Adoptiere ein virtuelles Haustier! Es waechst, wenn du Aufgaben erledigst."
              action={
                <Button size="lg" onClick={() => setShowCreate(true)} className="rounded-full px-8">
                  Haustier adoptieren
                </Button>
              }
            />
          ) : (
            <div className="w-full max-w-md">
              <h2 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground text-center mb-6">
                Wähle dein Haustier
              </h2>

              {/* Pet Type Selection */}
              <div className="flex justify-center gap-4 mb-6">
                {PET_TYPES.map((pt) => (
                  <button
                    key={pt.type}
                    onClick={() => setSelectedType(pt.type)}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-xl transition-all",
                      selectedType === pt.type ? "bg-primary/20 scale-110 ring-2 ring-primary" : "bg-card neu-flat",
                    )}
                  >
                    <span className="text-3xl">{pt.emoji}</span>
                    <span className="text-xs mt-1">{pt.name}</span>
                  </button>
                ))}
              </div>

              {/* Name Input */}
              <div className="mb-6">
                <Input
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="Name deines Haustieres"
                  className="h-12 rounded-xl text-center text-lg"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 h-12 rounded-xl bg-transparent"
                >
                  Abbrechen
                </Button>
                <Button onClick={handleCreatePet} disabled={!petName.trim()} className="flex-1 h-12 rounded-xl">
                  Adoptieren
                </Button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    )
  }

  // Pet exists - show enhanced pet view
  const xpProgress = pet.xpToNextLevel > 0 ? (pet.xp / pet.xpToNextLevel) * 100 : 0
  const petEmoji =
    EVOLUTION_EMOJIS[pet.type][pet.evolutionStage - 1] || PET_TYPES.find((p) => p.type === pet.type)?.emoji

  return (
    <AppShell>
      <div className="flex flex-col items-center px-4 py-6">
        {/* Pet Display */}
        <div className="relative mb-4">
          <div
            className={cn(
              "w-40 h-40 rounded-full bg-card neu-flat flex items-center justify-center",
              pet.mood === "happy" && "animate-float",
            )}
          >
            <span className="text-7xl">{petEmoji}</span>
          </div>
          {/* Level Badge */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground rounded-full text-sm font-bold flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            Lvl {pet.level}
          </div>
        </div>

        {/* Pet Name */}
        <h1 className="font-[var(--font-fredoka)] text-3xl font-bold text-foreground mb-1">{pet.name}</h1>
        <p className="text-muted-foreground mb-4">
          Stufe {pet.evolutionStage} {PET_TYPES.find((pt) => pt.type === pet.type)?.name}
        </p>

        {/* Evolution Display */}
        <div className="w-full max-w-xs mb-6">
          <PetEvolutionDisplay pet={pet} showDetails />
        </div>

        {/* Health Bar */}
        <div className="w-full max-w-xs mb-4">
          <PetHealthBar health={pet.health} />
        </div>

        {/* XP Progress */}
        <div className="w-full max-w-xs mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Erfahrung</span>
            <span className="font-medium">
              {pet.xp} / {pet.xpToNextLevel} XP
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="w-full max-w-xs">
          <PetActions pet={pet} />
        </div>

        {/* Info */}
        <p className="text-sm text-muted-foreground text-center mt-8 max-w-xs">
          Dein Haustier bekommt XP, wenn du Aufgaben erledigst! Bei genug XP steigt es im Level und entwickelt sich
          weiter.
        </p>
      </div>
    </AppShell>
  )
}
