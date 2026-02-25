"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EMOJIS = ["🌟", "🎮", "🎯", "⭐", "🔥", "💎", "🎁", "🏆"]
const PAIR_OPTIONS = [4, 6, 8] as const
const POINTS_WIN = 20
const MEMORY_STORAGE_KEY = "famiapp-memory-progress"
const MEMORY_XP_WIN = 25
const MEMORY_XP_PER_LEVEL = 100

interface MemoryGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
}

function createShuffledCards(pairs: number) {
  const emojis = EMOJIS.slice(0, pairs).flatMap((e) => [e, e])
  return emojis
    .map((emoji, i) => ({ id: i, emoji, flipped: false, solved: false }))
    .sort(() => Math.random() - 0.5)
}

export function MemoryGame({ onAwardPoints, onClose }: MemoryGameProps) {
  const [pairCount, setPairCount] = useState<number>(4)
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; solved: boolean }[]>(() => createShuffledCards(4))
  const [first, setFirst] = useState<number | null>(null)
  const [second, setSecond] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [hasAwarded, setHasAwarded] = useState(false)
  const [moveCount, setMoveCount] = useState(0)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)

  const solvedCount = useMemo(() => cards.filter((c) => c.solved).length, [cards])
  const allSolved = solvedCount === cards.length
  const totalPairs = cards.length / 2

  const startNewGame = (pairs: number) => {
    setPairCount(pairs)
    setCards(createShuffledCards(pairs))
    setFirst(null)
    setSecond(null)
    setLocked(false)
    setHasAwarded(false)
    setMoveCount(0)
    setGameStarted(true)
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MEMORY_STORAGE_KEY)
      if (raw) {
        const { level: l = 1, xp: x = 0 } = JSON.parse(raw)
        setLevel(l)
        setXp(x)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (allSolved && !hasAwarded) {
      setHasAwarded(true)
      onAwardPoints(POINTS_WIN, "Memory gewonnen! 🎉", "Memory: Gewonnen")
      setXp((prev) => {
        const next = prev + MEMORY_XP_WIN
        const newLevel = Math.max(1, Math.floor(next / MEMORY_XP_PER_LEVEL) + 1)
        setLevel(newLevel)
        try {
          localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify({ level: newLevel, xp: next }))
        } catch {
          // ignore
        }
        return next
      })
    }
  }, [allSolved, hasAwarded, onAwardPoints])

  const handleClick = (index: number) => {
    if (locked || cards[index].flipped || cards[index].solved) return
    const newCards = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c))
    setCards(newCards)
    if (first == null) {
      setFirst(index)
      return
    }
    setMoveCount((m) => m + 1)
    setSecond(index)
    setLocked(true)
    const [a, b] = [first, index]
    if (newCards[a].emoji === newCards[b].emoji) {
      setCards((prev) =>
        prev.map((c, i) => (i === a || i === b ? { ...c, solved: true } : c)),
      )
      setFirst(null)
      setSecond(null)
      setLocked(false)
    } else {
      setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)),
        )
        setFirst(null)
        setSecond(null)
        setLocked(false)
      }, 600)
    }
  }

  if (allSolved) {
    return (
      <div className="space-y-6 text-center py-8">
        <p className="text-2xl font-bold text-foreground">Gewonnen! +{POINTS_WIN} Goldmünzen</p>
        <p className="text-sm text-muted-foreground">Level {level}</p>
        <p className="text-sm text-muted-foreground">Du hast {moveCount} Züge gebraucht.</p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => startNewGame(pairCount)} variant="outline">
            Nochmal spielen ({pairCount} Paare)
          </Button>
          <Button onClick={onClose}>Zurück zu den Spielen</Button>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Wähle die Anzahl der Paare:</p>
        <div className="grid grid-cols-3 gap-3">
          {PAIR_OPTIONS.map((p) => (
            <Button key={p} variant="outline" className="h-14" onClick={() => startNewGame(p)}>
              {p} Paare
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Level {level}</span>
        </div>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Beenden
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Finde alle Paare. {solvedCount / 2}/{totalPairs} Paare · {moveCount} Züge
        </p>
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          Level {level}
        </span>
      </div>
      <div className={cn("grid gap-3", pairCount === 6 ? "grid-cols-3" : "grid-cols-4")}>
        {cards.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleClick(i)}
            className={cn(
              "aspect-square rounded-xl border-2 flex items-center justify-center text-2xl transition-all",
              card.solved && "bg-primary/20 border-primary opacity-60",
              card.flipped && !card.solved && "bg-primary/30 border-primary",
              !card.flipped && !card.solved && "bg-muted/50 border-border hover:bg-muted",
            )}
          >
            {card.flipped || card.solved ? card.emoji : "?"}
          </button>
        ))}
      </div>
      <Button variant="outline" className="w-full" onClick={onClose}>
        Beenden
      </Button>
    </div>
  )
}
