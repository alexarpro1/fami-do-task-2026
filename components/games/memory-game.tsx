"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"

const EMOJIS = ["🌟", "🎮", "🎯", "⭐", "🔥", "💎", "🎁", "🏆"]
const PAIR_OPTIONS = [4, 6, 8] as const
const POINTS_WIN = 20
const MEMORY_STORAGE_KEY = "famiapp-memory-progress"
const MEMORY_XP_WIN = 25
const MEMORY_XP_PER_LEVEL = 100
const MEMORY_GAME_ID = "memory" as const

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
  const bonusClaimedRef = useRef<number[]>([])

  const solvedCount = useMemo(() => cards.filter((c) => c.solved).length, [cards])
  const allSolved = solvedCount === cards.length
  const totalPairs = cards.length / 2

  const { xpInCurrentLevel, xpForNextLevel, nextLevel } = getLevelProgress(xp, MEMORY_XP_PER_LEVEL)
  const nextBonusLevel = getNextBonusLevel(MEMORY_GAME_ID, level)

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
        const parsed = JSON.parse(raw)
        const { level: l = 1, xp: x = 0, bonusClaimedLevels } = parsed
        setLevel(typeof l === "number" && l > 0 ? l : 1)
        setXp(typeof x === "number" && x >= 0 ? x : 0)
        if (Array.isArray(bonusClaimedLevels)) {
          bonusClaimedRef.current = bonusClaimedLevels.filter((n: unknown) => typeof n === "number" && Number.isFinite(n))
        }
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (allSolved && !hasAwarded) {
      setHasAwarded(true)
      onAwardPoints(POINTS_WIN, "Memory gewonnen! 🎉", "Memory: Gewonnen")
      setXp((prevXp) => {
        const { xp: nextXp, level: newLevel, bonusClaimedLevels, bonusCoins, newBonusLevels } = applyXpAndGetBonuses(
          MEMORY_GAME_ID,
          { xp: prevXp, level, bonusClaimedLevels: bonusClaimedRef.current },
          MEMORY_XP_WIN,
          MEMORY_XP_PER_LEVEL,
        )
        bonusClaimedRef.current = bonusClaimedLevels
        setLevel(newLevel)
        try {
          localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify({ level: newLevel, xp: nextXp, bonusClaimedLevels }))
        } catch {
          // ignore
        }
        if (bonusCoins > 0 && newBonusLevels.length > 0) {
          const reachedText = newBonusLevels.length === 1 ? `Level ${newBonusLevels[0]}` : `Level ${newBonusLevels.join(", ")}`
          onAwardPoints(bonusCoins, `Bonus: ${reachedText} erreicht! +${bonusCoins} Goldmünzen`)
        }
        return nextXp
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
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Level {level}</span>
            {nextBonusLevel && nextBonusLevel > level && <span>Nächster Bonus bei Level {nextBonusLevel}</span>}
          </div>
          <div>
            XP {xpInCurrentLevel}/{xpForNextLevel || 0}
            {nextLevel ? ` bis Level ${nextLevel}` : " · Max-Level erreicht"}
          </div>
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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          XP {xpInCurrentLevel}/{xpForNextLevel || 0}
          {nextLevel ? ` bis Level ${nextLevel}` : " · Max-Level erreicht"}
        </span>
        {nextBonusLevel && nextBonusLevel > level && <span>Nächster Bonus bei Level {nextBonusLevel}</span>}
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
