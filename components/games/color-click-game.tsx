"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"

const ROUND_OPTIONS = [5, 10] as const
const POINTS_PER_CORRECT = 5
const GREEN_DELAY_MIN = 800
const GREEN_DELAY_MAX = 2500
const COLOR_STORAGE_KEY = "famiapp-color-click-progress"
const COLOR_XP_PER_ROUND = 5
const COLOR_XP_PER_LEVEL = 100
const COLOR_GAME_ID = "color" as const

interface ColorClickGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
}

export function ColorClickGame({ onAwardPoints, onClose }: ColorClickGameProps) {
  const [totalRounds, setTotalRounds] = useState<number>(5)
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<"wait" | "green" | "red" | "result">("wait")
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState("")
  const [completed, setCompleted] = useState(false)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const bonusClaimedRef = useRef<number[]>([])

  const { xpInCurrentLevel, xpForNextLevel, nextLevel } = getLevelProgress(xp, COLOR_XP_PER_LEVEL)
  const nextBonusLevel = getNextBonusLevel(COLOR_GAME_ID, level)

  const showGreen = useCallback(() => {
    setPhase("green")
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLOR_STORAGE_KEY)
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
    if (phase !== "wait" || round >= totalRounds) return
    const delay = GREEN_DELAY_MIN + Math.random() * (GREEN_DELAY_MAX - GREEN_DELAY_MIN)
    const t = setTimeout(showGreen, delay)
    return () => clearTimeout(t)
  }, [phase, round, showGreen])

  const handleClick = () => {
    if (phase === "green") {
      const points = POINTS_PER_CORRECT
      const newScore = score + points
      setScore(newScore)
      setPhase("result")
      setMessage(`Richtig! +${points} Goldmünzen`)
      setXp((prevXp) => {
        const { xp: nextXp, level: newLevel, bonusClaimedLevels, bonusCoins, newBonusLevels } = applyXpAndGetBonuses(
          COLOR_GAME_ID,
          { xp: prevXp, level, bonusClaimedLevels: bonusClaimedRef.current },
          COLOR_XP_PER_ROUND,
          COLOR_XP_PER_LEVEL,
        )
        bonusClaimedRef.current = bonusClaimedLevels
        setLevel(newLevel)
        try {
          localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify({ level: newLevel, xp: nextXp, bonusClaimedLevels }))
        } catch {
          // ignore
        }
        if (bonusCoins > 0 && newBonusLevels.length > 0) {
          const reachedText = newBonusLevels.length === 1 ? `Level ${newBonusLevels[0]}` : `Level ${newBonusLevels.join(", ")}`
          onAwardPoints(bonusCoins, `Bonus: ${reachedText} erreicht! +${bonusCoins} Goldmünzen`)
        }
        return nextXp
      })
      if (round + 1 >= totalRounds) {
        setCompleted(true)
        onAwardPoints(newScore, "Alle Runden geschafft! 🎉")
        return
      }
      setTimeout(() => {
        setRound((r) => r + 1)
        setPhase("wait")
        setMessage("")
      }, 600)
    } else if (phase === "wait") {
      setPhase("red")
      setMessage("Zu früh! Warte auf GRÜN.")
      setTimeout(() => {
        setPhase("wait")
        setMessage("")
      }, 800)
    }
  }

  const startNewGame = (rounds: number) => {
    setTotalRounds(rounds)
    setRound(0)
    setScore(0)
    setPhase("wait")
    setMessage("")
    setCompleted(false)
    setGameStarted(true)
  }

  if (completed) {
    return (
      <div className="space-y-6 text-center py-8">
        <p className="text-2xl font-bold text-foreground">Alle Runden geschafft! 🎉</p>
        <p className="text-sm text-muted-foreground">Level {level} · {score} Goldmünzen</p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => startNewGame(totalRounds)} variant="outline">
            Nochmal spielen ({totalRounds} Runden)
          </Button>
          <Button onClick={onClose}>Zurück zu den Spielen</Button>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Wie viele Runden möchtest du spielen?</p>
        <div className="grid grid-cols-2 gap-3">
          {ROUND_OPTIONS.map((r) => (
            <Button key={r} variant="outline" className="h-14" onClick={() => startNewGame(r)}>
              {r} Runden
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
          Runde {round + 1} / {totalRounds}. Klicke nur, wenn der Bildschirm <strong>grün</strong> wird!
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
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-full min-h-[280px] rounded-2xl border-2 transition-colors flex flex-col items-center justify-center gap-2",
          phase === "green" && "bg-green-500 border-green-400",
          phase === "wait" && "bg-muted/50 border-border",
          phase === "red" && "bg-red-500/40 border-red-500",
          phase === "result" && "bg-primary/20 border-primary",
        )}
      >
        {phase === "wait" && <span className="text-xl text-muted-foreground">Warte auf GRÜN...</span>}
        {phase === "green" && <span className="text-3xl font-bold text-white">KLICK! 👆</span>}
        {phase === "red" && <span className="text-xl font-bold text-red-100">Zu früh!</span>}
        {phase === "result" && <span className="text-xl font-bold text-foreground">{message}</span>}
      </button>
      <p className="text-center text-muted-foreground">Goldmünzen diese Runde: {score}</p>
      <Button variant="outline" className="w-full" onClick={onClose}>
        Beenden
      </Button>
    </div>
  )
}
