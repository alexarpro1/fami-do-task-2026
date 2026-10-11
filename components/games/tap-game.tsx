"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"
import { getTapDifficulty } from "@/lib/game-difficulty"
import { LevelUpOverlay } from "./level-up-overlay"

const POINTS_FAST = 15
const POINTS_MED = 10
const POINTS_SLOW = 5
const STORAGE_KEY = "famiapp-tap-progress"
const BEST_KEY = "famiapp-tap-best-seconds"
const XP_FAST = 15
const XP_MED = 10
const XP_SLOW = 5
const XP_PER_LEVEL = 100
const GAME_ID = "tap" as const

const BTN_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-blue-500 text-white",
  "bg-purple-500 text-white",
  "bg-orange-500 text-white",
  "bg-pink-500 text-white",
]

interface TapGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
  onNextGame?: () => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function TapGame({ onAwardPoints, onClose, onNextGame }: TapGameProps) {
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle")
  const [taps, setTaps] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [bestSeconds, setBestSeconds] = useState<number | null>(null)
  const [lastWasRecord, setLastWasRecord] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [buttonOrder, setButtonOrder] = useState<number[]>([0])
  const [wrongTap, setWrongTap] = useState(false)
  const startTime = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const switchRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bonusClaimedRef = useRef<number[]>([])
  const [levelUp, setLevelUp] = useState<{ show: boolean; level: number; bonus: number }>({ show: false, level: 0, bonus: 0 })

  const diff = getTapDifficulty(level)
  const { xpInCurrentLevel, xpForNextLevel, nextLevel } = getLevelProgress(xp, XP_PER_LEVEL)
  const nextBonusLevel = getNextBonusLevel(GAME_ID, level)

  useEffect(() => {
    try { const raw = localStorage.getItem(BEST_KEY); if (raw) { const sec = parseFloat(raw); if (!Number.isNaN(sec)) setBestSeconds(sec) } } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setLevel(typeof parsed.level === "number" && parsed.level > 0 ? parsed.level : 1)
        setXp(typeof parsed.xp === "number" && parsed.xp >= 0 ? parsed.xp : 0)
        if (Array.isArray(parsed.bonusClaimedLevels)) bonusClaimedRef.current = parsed.bonusClaimedLevels.filter((n: unknown) => typeof n === "number" && Number.isFinite(n))
      }
    } catch { /* ignore */ }
  }, [])

  const pickNewActive = useCallback((count: number) => {
    setActiveIdx(Math.floor(Math.random() * count))
  }, [])

  const start = useCallback(() => {
    const d = getTapDifficulty(level)
    setPhase("playing"); setTaps(0); setElapsed(0); setLastWasRecord(false); setWrongTap(false)
    const order = Array.from({ length: d.buttonCount }, (_, i) => i)
    setButtonOrder(d.shufflePositions ? shuffle(order) : order)
    setActiveIdx(Math.floor(Math.random() * d.buttonCount))
    startTime.current = Date.now()
    intervalRef.current = setInterval(() => setElapsed(Math.round((Date.now() - (startTime.current ?? 0)) / 100) / 10), 100)
    if (d.buttonCount > 1 && d.switchIntervalMs > 0) {
      switchRef.current = setInterval(() => {
        setActiveIdx((prev) => {
          let next = prev
          while (next === prev) next = Math.floor(Math.random() * d.buttonCount)
          return next
        })
        if (d.shufflePositions) setButtonOrder((prev) => shuffle(prev))
      }, d.switchIntervalMs)
    }
  }, [level])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (switchRef.current) clearInterval(switchRef.current)
    }
  }, [])

  const finishGame = useCallback((sec: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (switchRef.current) clearInterval(switchRef.current)
    setElapsed(sec)
    const d = getTapDifficulty(level)
    let points = POINTS_SLOW, addXp = XP_SLOW
    if (sec <= d.fastThresholdSec) { points = POINTS_FAST; addXp = XP_FAST }
    else if (sec <= d.medThresholdSec) { points = POINTS_MED; addXp = XP_MED }
    onAwardPoints(points, sec <= d.fastThresholdSec ? "Megaschnell! ⚡" : sec <= d.medThresholdSec ? "Schnell! 👍" : "Geschafft! 🎉")
    setXp((prevXp) => {
      const result = applyXpAndGetBonuses(GAME_ID, { xp: prevXp, level, bonusClaimedLevels: bonusClaimedRef.current }, addXp, XP_PER_LEVEL)
      bonusClaimedRef.current = result.bonusClaimedLevels
      setLevel(result.level)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: result.level, xp: result.xp, bonusClaimedLevels: result.bonusClaimedLevels })) } catch { /* ignore */ }
      if (result.bonusCoins > 0) onAwardPoints(result.bonusCoins, `Bonus: Level ${result.newBonusLevels.join(", ")} erreicht! +${result.bonusCoins} Goldmünzen`)
      if (result.leveledUp) setLevelUp({ show: true, level: result.level, bonus: result.bonusCoins })
      return result.xp
    })
    const isNewRecord = bestSeconds == null || sec < bestSeconds
    setLastWasRecord(isNewRecord)
    if (isNewRecord) { setBestSeconds(sec); try { localStorage.setItem(BEST_KEY, String(sec)) } catch { /* ignore */ } }
    setPhase("done")
  }, [level, onAwardPoints, bestSeconds])

  const handleTap = useCallback((btnIdx: number) => {
    if (phase !== "playing") return
    if (diff.buttonCount > 1 && btnIdx !== activeIdx) {
      setWrongTap(true)
      setTimeout(() => setWrongTap(false), 300)
      return
    }
    const next = taps + 1
    setTaps(next)
    if (next >= diff.targetTaps) {
      const sec = Math.round((Date.now() - (startTime.current ?? 0)) / 100) / 10
      finishGame(sec)
    } else if (diff.buttonCount > 1) {
      pickNewActive(diff.buttonCount)
      if (diff.shufflePositions) setButtonOrder((prev) => shuffle(prev))
    }
  }, [phase, taps, diff, activeIdx, finishGame, pickNewActive])

  const tapPercent = Math.min(100, Math.round((taps / diff.targetTaps) * 100))
  const xpPercent = xpForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpForNextLevel) * 100)) : 100

  const modeLabel = useMemo(() => {
    if (diff.buttonCount === 1) return "Tippe den Button!"
    return `Tippe nur den leuchtenden Button! (${diff.buttonCount} Buttons)`
  }, [diff.buttonCount])

  return (
    <div className="space-y-5">
      <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={() => setLevelUp((p) => ({ ...p, show: false }))} />

      {phase === "idle" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Tippe {diff.targetTaps} Mal so schnell du kannst!</p>
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
          {diff.buttonCount > 1 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-sm font-medium text-foreground">{diff.buttonCount} Buttons</p>
              <p className="text-xs text-muted-foreground">Tippe nur den leuchtenden Button! Falsche Buttons geben keinen Punkt.</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Unter {diff.fastThresholdSec}s = {POINTS_FAST} Goldmünzen · Unter {diff.medThresholdSec}s = {POINTS_MED}
          </p>
          {bestSeconds != null && <p className="text-xs text-muted-foreground">Deine Bestzeit: {bestSeconds}s</p>}
          <Button className="w-full" size="lg" onClick={start}>Start</Button>
        </>
      )}

      {phase === "playing" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-foreground">{taps}/{diff.targetTaps}</p>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Level {level}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${tapPercent}%` }} transition={{ duration: 0.1 }} />
          </div>
          <p className="text-center text-muted-foreground text-sm">{elapsed}s</p>

          {diff.buttonCount === 1 ? (
            <motion.button
              type="button"
              onClick={() => handleTap(0)}
              whileTap={{ scale: 0.96 }}
              className="w-full min-h-[240px] rounded-2xl bg-primary text-primary-foreground text-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Tippen! 👆
            </motion.button>
          ) : (
            <div className={cn(
              "grid gap-3",
              diff.buttonCount <= 2 ? "grid-cols-2" : diff.buttonCount <= 4 ? "grid-cols-2" : "grid-cols-3",
            )}>
              <AnimatePresence>
                {buttonOrder.map((btnIdx) => {
                  const isActive = btnIdx === activeIdx
                  const btnSize = diff.shrinkButtons ? "min-h-[100px]" : "min-h-[120px]"
                  return (
                    <motion.button
                      key={btnIdx}
                      layout
                      type="button"
                      onClick={() => handleTap(btnIdx)}
                      whileTap={{ scale: 0.93 }}
                      animate={wrongTap && !isActive ? { x: [0, -4, 4, -3, 3, 0] } : {}}
                      className={cn(
                        "rounded-2xl text-lg font-bold transition-all flex items-center justify-center",
                        btnSize,
                        isActive
                          ? cn(BTN_COLORS[btnIdx % BTN_COLORS.length], "ring-4 ring-white/30 shadow-lg scale-105")
                          : "bg-muted/60 border-2 border-border text-muted-foreground",
                      )}
                    >
                      {isActive ? "Hier! 👆" : ""}
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
          {diff.buttonCount > 1 && (
            <p className="text-center text-xs text-muted-foreground">{modeLabel}</p>
          )}
        </>
      )}

      {phase === "done" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5 py-8">
          <p className="text-6xl mb-1">⚡</p>
          <p className="text-3xl font-bold text-foreground">Fertig in {elapsed}s!</p>
          {lastWasRecord && <p className="text-lg font-semibold text-green-600 dark:text-green-400">Neue Bestzeit! 🏆</p>}
          {bestSeconds != null && !lastWasRecord && <p className="text-sm text-muted-foreground">Bestzeit: {bestSeconds}s</p>}
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={onClose} variant="outline" size="lg" className="text-base bg-primary/10 hover:bg-primary/15 text-primary border-primary/20">Zurück zu den Spielen</Button>
            <Button onClick={start} variant="outline" size="lg" className="text-base">Nochmal spielen</Button>
            <Button onClick={() => setPhase("idle")} size="lg" className="text-base">Weiter</Button>
          </div>
        </motion.div>
      )}

      <Button variant="outline" className="w-full" onClick={onClose}>Beenden</Button>
    </div>
  )
}
