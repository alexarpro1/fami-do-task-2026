"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"
import { getReactionDifficulty } from "@/lib/game-difficulty"
import { LevelUpOverlay } from "./level-up-overlay"

type Phase = "wait" | "ready" | "green" | "too-early" | "done"

const POINTS_FAST = 15
const POINTS_MED = 10
const POINTS_SLOW = 5
const STORAGE_KEY = "famiapp-reaction-progress"
const XP_FAST = 15
const XP_MED = 10
const XP_SLOW = 5
const XP_PER_LEVEL = 100
const GAME_ID = "reaction" as const

interface ReactionGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
  onNextGame?: () => void
}

export function ReactionGame({ onAwardPoints, onClose, onNextGame }: ReactionGameProps) {
  const [phase, setPhase] = useState<Phase>("wait")
  const [round, setRound] = useState(1)
  const [reactionMs, setReactionMs] = useState<number | null>(null)
  const [greenAt, setGreenAt] = useState<number | null>(null)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [bestMsThisSession, setBestMsThisSession] = useState<number | null>(null)
  const bonusClaimedRef = useRef<number[]>([])
  const [levelUp, setLevelUp] = useState<{ show: boolean; level: number; bonus: number }>({ show: false, level: 0, bonus: 0 })

  const diff = getReactionDifficulty(level)
  const { xpInCurrentLevel, xpForNextLevel, nextLevel } = getLevelProgress(xp, XP_PER_LEVEL)
  const nextBonusLevel = getNextBonusLevel(GAME_ID, level)

  const startRound = useCallback(() => {
    setPhase("wait")
    setReactionMs(null)
    setGreenAt(null)
    const currentDiff = getReactionDifficulty(level)
    const delay = currentDiff.delayMin + Math.random() * (currentDiff.delayMax - currentDiff.delayMin)
    const t = setTimeout(() => {
      setPhase("green")
      setGreenAt(Date.now())
    }, delay)
    return () => clearTimeout(t)
  }, [level])

  useEffect(() => {
    if (phase === "wait") startRound()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const { level: l = 1, xp: x = 0, bonusClaimedLevels } = parsed
        setLevel(typeof l === "number" && l > 0 ? l : 1)
        setXp(typeof x === "number" && x >= 0 ? x : 0)
        if (Array.isArray(bonusClaimedLevels)) {
          bonusClaimedRef.current = bonusClaimedLevels.filter((n: unknown) => typeof n === "number" && Number.isFinite(n))
        }
      }
    } catch { /* ignore */ }
  }, [])

  const handleClick = () => {
    if (phase === "green") {
      const ms = greenAt ? Math.round(Date.now() - greenAt) : 0
      setReactionMs(ms)
      let points = POINTS_SLOW
      let addXp = XP_SLOW
      if (ms < diff.fastThresholdMs) {
        points = POINTS_FAST; addXp = XP_FAST
      } else if (ms < diff.medThresholdMs) {
        points = POINTS_MED; addXp = XP_MED
      }
      onAwardPoints(points, ms < diff.fastThresholdMs ? "Super schnell! ⚡" : ms < diff.medThresholdMs ? "Gut! 👍" : "Geschafft! 🎉")
      setXp((prevXp) => {
        const result = applyXpAndGetBonuses(GAME_ID, { xp: prevXp, level, bonusClaimedLevels: bonusClaimedRef.current }, addXp, XP_PER_LEVEL)
        bonusClaimedRef.current = result.bonusClaimedLevels
        setLevel(result.level)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: result.level, xp: result.xp, bonusClaimedLevels: result.bonusClaimedLevels })) } catch { /* ignore */ }
        if (result.bonusCoins > 0) {
          onAwardPoints(result.bonusCoins, `Bonus: Level ${result.newBonusLevels.join(", ")} erreicht! +${result.bonusCoins} Goldmünzen`)
        }
        if (result.leveledUp) {
          setLevelUp({ show: true, level: result.level, bonus: result.bonusCoins })
        }
        return result.xp
      })
      setBestMsThisSession((prev) => (prev == null || ms < prev ? ms : prev))
      setPhase("done")
      return
    }
    if (phase === "wait") {
      setPhase("too-early")
      setTimeout(() => setPhase("wait"), 800)
    }
  }

  const nextRound = () => {
    setRound((r) => r + 1)
    setPhase("wait")
  }

  const xpPercent = xpForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpForNextLevel) * 100)) : 100

  return (
    <div className="space-y-5">
      <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={() => setLevelUp((p) => ({ ...p, show: false }))} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Runde {round} · Warte auf Grün!</p>
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

      <AnimatePresence mode="wait">
        {phase === "done" ? (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full min-h-[280px] rounded-2xl border-2 border-border bg-muted/50 flex flex-col items-center justify-center gap-4">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }} className="text-3xl font-bold text-foreground">
              {reactionMs != null ? `${reactionMs} ms` : ""}
            </motion.span>
            {reactionMs != null && (
              <span className="text-sm text-muted-foreground">
                {reactionMs < diff.fastThresholdMs ? "Blitzschnell! ⚡" : reactionMs < diff.medThresholdMs ? "Schnell! 👍" : "Gut getroffen! 🎯"}
              </span>
            )}
            {bestMsThisSession != null && <span className="text-xs text-muted-foreground">Beste: {bestMsThisSession} ms</span>}
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button onClick={nextRound} size="lg" className="text-base">Weiter</Button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="game"
            type="button"
            onClick={handleClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: phase === "green" ? [1, 1.02, 1] : 1 }}
            transition={phase === "green" ? { scale: { repeat: Infinity, duration: 0.6 } } : {}}
            className={cn(
              "w-full min-h-[280px] rounded-2xl border-2 transition-colors flex flex-col items-center justify-center gap-4",
              phase === "green" && "bg-green-500 border-green-400",
              phase === "wait" && "bg-muted/50 border-border",
              phase === "too-early" && "bg-red-500/30 border-red-500",
            )}
          >
            {phase === "wait" && <span className="text-4xl font-bold text-muted-foreground">Warte...</span>}
            {phase === "green" && <span className="text-4xl font-bold text-white">KLICK! 👆</span>}
            {phase === "too-early" && <span className="text-2xl font-bold text-red-200">Zu früh!</span>}
          </motion.button>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        <Button variant="outline" className="w-full bg-primary/10 hover:bg-primary/15 text-primary border-primary/20" onClick={onClose}>Zurück zu den Spielen</Button>
      </div>
    </div>
  )
}
