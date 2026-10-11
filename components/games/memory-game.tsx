"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"
import { getMemoryDifficulty } from "@/lib/game-difficulty"
import { LevelUpOverlay } from "./level-up-overlay"

const ALL_EMOJIS = ["🌟", "🎮", "🎯", "⭐", "🔥", "💎", "🎁", "🏆", "🚀", "🎵"]
const POINTS_WIN = 20
const STORAGE_KEY = "famiapp-memory-progress"
const XP_WIN = 25
const XP_PER_LEVEL = 100
const GAME_ID = "memory" as const

interface MemoryGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
  onNextGame?: () => void
}

type Card = { id: number; emoji: string; flipped: boolean; solved: boolean }

function createShuffledCards(pairs: number): Card[] {
  const emojis = ALL_EMOJIS.slice(0, pairs).flatMap((e) => [e, e])
  return emojis.map((emoji, i) => ({ id: i, emoji, flipped: false, solved: false })).sort(() => Math.random() - 0.5)
}

export function MemoryGame({ onAwardPoints, onClose, onNextGame }: MemoryGameProps) {
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const bonusClaimedRef = useRef<number[]>([])

  const diff = getMemoryDifficulty(level)
  const [cards, setCards] = useState<Card[]>(() => createShuffledCards(diff.pairs))
  const [first, setFirst] = useState<number | null>(null)
  const [second, setSecond] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [hasAwarded, setHasAwarded] = useState(false)
  const [moveCount, setMoveCount] = useState(0)
  const [peeking, setPeeking] = useState(false)
  const [levelUp, setLevelUp] = useState<{ show: boolean; level: number; bonus: number }>({ show: false, level: 0, bonus: 0 })

  const { xpInCurrentLevel, xpForNextLevel, nextLevel } = getLevelProgress(xp, XP_PER_LEVEL)
  const nextBonusLevel = getNextBonusLevel(GAME_ID, level)
  const solvedCount = useMemo(() => cards.filter((c) => c.solved).length, [cards])
  const allSolved = solvedCount === cards.length
  const totalPairs = cards.length / 2

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const { level: l = 1, xp: x = 0, bonusClaimedLevels } = parsed
        setLevel(typeof l === "number" && l > 0 ? l : 1)
        setXp(typeof x === "number" && x >= 0 ? x : 0)
        if (Array.isArray(bonusClaimedLevels)) bonusClaimedRef.current = bonusClaimedLevels.filter((n: unknown) => typeof n === "number" && Number.isFinite(n))
      }
    } catch { /* ignore */ }
  }, [])

  const startGame = useCallback((lvl: number) => {
    const d = getMemoryDifficulty(lvl)
    const newCards = createShuffledCards(d.pairs)
    setCards(newCards)
    setFirst(null); setSecond(null); setLocked(false); setHasAwarded(false); setMoveCount(0)
    if (d.peekMs > 0) {
      setPeeking(true)
      setCards(newCards.map((c) => ({ ...c, flipped: true })))
      setTimeout(() => {
        setCards(newCards.map((c) => ({ ...c, flipped: false })))
        setPeeking(false)
      }, d.peekMs)
    }
  }, [])

  useEffect(() => { startGame(level) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (allSolved && !hasAwarded) {
      setHasAwarded(true)
      onAwardPoints(POINTS_WIN, "Memory gewonnen! 🎉")
      setXp((prevXp) => {
        const result = applyXpAndGetBonuses(GAME_ID, { xp: prevXp, level, bonusClaimedLevels: bonusClaimedRef.current }, XP_WIN, XP_PER_LEVEL)
        bonusClaimedRef.current = result.bonusClaimedLevels
        setLevel(result.level)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: result.level, xp: result.xp, bonusClaimedLevels: result.bonusClaimedLevels })) } catch { /* ignore */ }
        if (result.bonusCoins > 0) onAwardPoints(result.bonusCoins, `Bonus: Level ${result.newBonusLevels.join(", ")} erreicht! +${result.bonusCoins} Goldmünzen`)
        if (result.leveledUp) setLevelUp({ show: true, level: result.level, bonus: result.bonusCoins })
        return result.xp
      })
    }
  }, [allSolved, hasAwarded, onAwardPoints, level])

  const handleClick = (index: number) => {
    if (locked || peeking || cards[index].flipped || cards[index].solved) return
    const newCards = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c))
    setCards(newCards)
    if (first == null) { setFirst(index); return }
    setMoveCount((m) => m + 1)
    setSecond(index)
    setLocked(true)
    const [a, b] = [first, index]
    if (newCards[a].emoji === newCards[b].emoji) {
      setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, solved: true } : c)))
      setFirst(null); setSecond(null); setLocked(false)
    } else {
      setTimeout(() => {
        setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)))
        setFirst(null); setSecond(null); setLocked(false)
      }, diff.mismatchDelayMs)
    }
  }

  const xpPercent = xpForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpForNextLevel) * 100)) : 100

  if (allSolved) {
    return (
      <div className="space-y-6 text-center py-8">
        <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={() => setLevelUp((p) => ({ ...p, show: false }))} />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <p className="text-6xl mb-3">🎉</p>
          <p className="text-3xl font-bold text-foreground">Gewonnen!</p>
          <p className="text-lg font-semibold text-primary mt-1">+{POINTS_WIN} Goldmünzen</p>
        </motion.div>
        <p className="text-base text-muted-foreground font-medium">Level {level} · {moveCount} Züge</p>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={onClose} variant="outline" size="lg" className="text-base bg-primary/10 hover:bg-primary/15 text-primary border-primary/20">Zurück zu den Spielen</Button>
          <Button onClick={() => startGame(level)} variant="outline" size="lg" className="text-base">Nochmal spielen</Button>
          <Button onClick={() => startGame(level)} size="lg" className="text-base">Weiter</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={() => setLevelUp((p) => ({ ...p, show: false }))} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{solvedCount / 2}/{totalPairs} Paare · {moveCount} Züge</p>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Level {level}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>XP {xpInCurrentLevel}/{xpForNextLevel || "Max"}</span>
          {nextBonusLevel && nextBonusLevel > level && <span>Bonus bei Level {nextBonusLevel}</span>}
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      {peeking && <p className="text-center text-xs text-primary animate-pulse">Merke dir die Karten!</p>}

      <div className={cn("grid gap-2.5", diff.gridCols === 3 ? "grid-cols-3" : "grid-cols-4")}>
        <AnimatePresence>
          {cards.map((card, i) => (
            <motion.button
              key={card.id}
              layout
              type="button"
              onClick={() => handleClick(i)}
              whileTap={!card.flipped && !card.solved ? { scale: 0.92 } : {}}
              className={cn(
                "aspect-square rounded-xl border-2 flex items-center justify-center text-2xl select-none",
                card.solved && "bg-primary/20 border-primary/40 opacity-60",
                card.flipped && !card.solved && "bg-primary/30 border-primary",
                !card.flipped && !card.solved && "bg-muted/50 border-border hover:bg-muted",
              )}
              style={{ perspective: "400px" }}
            >
              <AnimatePresence mode="wait">
                {card.flipped || card.solved ? (
                  <motion.span key="front" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {card.emoji}
                  </motion.span>
                ) : (
                  <motion.span key="back" initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="text-muted-foreground">
                    ?
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <Button variant="outline" className="w-full" onClick={onClose}>Beenden</Button>
    </div>
  )
}
