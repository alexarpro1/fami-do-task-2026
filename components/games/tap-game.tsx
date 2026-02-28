"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"

const TARGET_TAPS = 20
const POINTS_FAST = 15
const POINTS_MED = 10
const POINTS_SLOW = 5
const TIME_FAST = 10
const TIME_MED = 15
const TAP_STORAGE_KEY = "famiapp-tap-progress"
const TAP_BEST_KEY = "famiapp-tap-best-seconds"
const TAP_XP_FAST = 15
const TAP_XP_MED = 10
const TAP_XP_SLOW = 5
const TAP_XP_PER_LEVEL = 100
const TAP_GAME_ID = "tap" as const

interface TapGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
}

export function TapGame({ onAwardPoints, onClose }: TapGameProps) {
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle")
  const [taps, setTaps] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [bestSeconds, setBestSeconds] = useState<number | null>(null)
  const [lastWasRecord, setLastWasRecord] = useState(false)
  const startTime = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bonusClaimedRef = useRef<number[]>([])

  const { xpInCurrentLevel, xpForNextLevel, nextLevel } = getLevelProgress(xp, TAP_XP_PER_LEVEL)
  const nextBonusLevel = getNextBonusLevel(TAP_GAME_ID, level)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TAP_BEST_KEY)
      if (raw) {
        const sec = parseInt(raw, 10)
        if (!Number.isNaN(sec)) setBestSeconds(sec)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TAP_STORAGE_KEY)
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

  const start = useCallback(() => {
    setPhase("playing")
    setTaps(0)
    setElapsed(0)
    startTime.current = Date.now()
    intervalRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - (startTime.current ?? 0)) / 1000))
    }, 100)
  }, [])

  const handleTap = useCallback(() => {
    if (phase !== "playing") return
    const next = taps + 1
    setTaps(next)
    if (next >= TARGET_TAPS) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      const sec = (Date.now() - (startTime.current ?? 0)) / 1000
      let points = POINTS_SLOW
      let addXp = TAP_XP_SLOW
      if (sec <= TIME_FAST) {
        points = POINTS_FAST
        addXp = TAP_XP_FAST
      } else if (sec <= TIME_MED) {
        points = POINTS_MED
        addXp = TAP_XP_MED
      }
      onAwardPoints(
        points,
        sec <= TIME_FAST ? "Megaschnell! ⚡" : sec <= TIME_MED ? "Schnell! 👍" : "Geschafft! 🎉",
        "Tipp-Challenge: Geschafft",
      )
      setXp((prevXp) => {
        const { xp: nextXp, level: newLevel, bonusClaimedLevels, bonusCoins, newBonusLevels } = applyXpAndGetBonuses(
          TAP_GAME_ID,
          { xp: prevXp, level, bonusClaimedLevels: bonusClaimedRef.current },
          addXp,
          TAP_XP_PER_LEVEL,
        )
        bonusClaimedRef.current = bonusClaimedLevels
        setLevel(newLevel)
        try {
          localStorage.setItem(TAP_STORAGE_KEY, JSON.stringify({ level: newLevel, xp: nextXp, bonusClaimedLevels }))
        } catch {
          // ignore
        }
        if (bonusCoins > 0 && newBonusLevels.length > 0) {
          const reachedText = newBonusLevels.length === 1 ? `Level ${newBonusLevels[0]}` : `Level ${newBonusLevels.join(", ")}`
          onAwardPoints(bonusCoins, `Bonus: ${reachedText} erreicht! +${bonusCoins} Goldmünzen`)
        }
        return nextXp
      })
      const isNewRecord = bestSeconds == null || sec < bestSeconds
      setLastWasRecord(isNewRecord)
      if (isNewRecord) {
        setBestSeconds(sec)
        try {
          localStorage.setItem(TAP_BEST_KEY, String(sec))
        } catch {
          // ignore
        }
      }
      setPhase("done")
    }
  }, [phase, taps, onAwardPoints, bestSeconds])

  return (
    <div className="space-y-6">
      {phase === "idle" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Tippe {TARGET_TAPS} Mal so schnell du kannst. Unter {TIME_FAST}s = {POINTS_FAST} Goldmünzen, unter{" "}
              {TIME_MED}s = {POINTS_MED} Goldmünzen.
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
          {bestSeconds != null && (
            <p className="text-xs text-muted-foreground">Deine Bestzeit: {bestSeconds} Sekunden</p>
          )}
          <Button className="w-full" size="lg" onClick={start}>
            Start
          </Button>
        </>
      )}
      {phase === "playing" && (
        <>
          <div className="flex justify-end">
            <span className="text-xs font-medium text-muted-foreground">Level {level}</span>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-foreground">{taps} / {TARGET_TAPS}</p>
            <p className="text-muted-foreground">{elapsed}s</p>
          </div>
          <button
            type="button"
            onClick={handleTap}
            className={cn(
              "w-full min-h-[240px] rounded-2xl bg-primary text-primary-foreground text-xl font-bold",
              "hover:bg-primary/90 active:scale-[0.98] transition-transform",
            )}
          >
            Tippen! 👆
          </button>
        </>
      )}
      {phase === "done" && (
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-foreground">Fertig in {elapsed} Sekunden!</p>
          {lastWasRecord && (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Neue Bestzeit! 🏆</p>
          )}
          {bestSeconds != null && !lastWasRecord && (
            <p className="text-xs text-muted-foreground">Bestzeit: {bestSeconds} s</p>
          )}
          <Button onClick={start}>Nochmal spielen</Button>
        </div>
      )}
      <Button variant="outline" className="w-full" onClick={onClose}>
        Beenden
      </Button>
    </div>
  )
}
