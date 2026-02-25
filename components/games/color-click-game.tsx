"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ROUND_OPTIONS = [5, 10] as const
const POINTS_PER_CORRECT = 5
const GREEN_DELAY_MIN = 800
const GREEN_DELAY_MAX = 2500
const COLOR_STORAGE_KEY = "famiapp-color-click-progress"
const COLOR_XP_PER_ROUND = 5
const COLOR_XP_PER_LEVEL = 100

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

  const showGreen = useCallback(() => {
    setPhase("green")
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLOR_STORAGE_KEY)
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
      setXp((prev) => {
        const next = prev + COLOR_XP_PER_ROUND
        const newLevel = Math.max(1, Math.floor(next / COLOR_XP_PER_LEVEL) + 1)
        setLevel(newLevel)
        try {
          localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify({ level: newLevel, xp: next }))
        } catch {
          // ignore
        }
        return next
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
        <div className="flex justify-end">
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
          Runde {round + 1} / {totalRounds}. Klicke nur, wenn der Bildschirm <strong>grün</strong> wird!
        </p>
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          Level {level}
        </span>
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
