"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"
import { getColorDifficulty } from "@/lib/game-difficulty"
import { LevelUpOverlay } from "./level-up-overlay"

const POINTS_PER_CORRECT = 5
const STORAGE_KEY = "famiapp-color-click-progress"
const XP_PER_ROUND = 5
const XP_PER_LEVEL = 100
const GAME_ID = "color" as const

const WRONG_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  red: { bg: "bg-red-500", border: "border-red-400", text: "text-red-100", label: "ROT" },
  orange: { bg: "bg-orange-500", border: "border-orange-400", text: "text-orange-100", label: "ORANGE" },
  blue: { bg: "bg-blue-500", border: "border-blue-400", text: "text-blue-100", label: "BLAU" },
  purple: { bg: "bg-purple-500", border: "border-purple-400", text: "text-purple-100", label: "LILA" },
  yellow: { bg: "bg-yellow-400", border: "border-yellow-300", text: "text-yellow-900", label: "GELB" },
}
const DEFAULT_WRONG = WRONG_COLORS.red

type FieldState = "hidden" | "green" | "wrong" | "clicked-right" | "clicked-wrong"
type Field = { id: number; state: FieldState; color: string }

interface ColorClickGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
  onNextGame?: () => void
}

export function ColorClickGame({ onAwardPoints, onClose, onNextGame }: ColorClickGameProps) {
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const bonusClaimedRef = useRef<number[]>([])

  const diff = getColorDifficulty(level)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [fields, setFields] = useState<Field[]>([])
  const [waitingForClick, setWaitingForClick] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [levelUp, setLevelUp] = useState<{ show: boolean; level: number; bonus: number }>({ show: false, level: 0, bonus: 0 })
  const [pendingAdvance, setPendingAdvance] = useState<{ round: number; addedScore: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const greenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { xpInCurrentLevel, xpForNextLevel, nextLevel } = getLevelProgress(xp, XP_PER_LEVEL)
  const nextBonusLevel = getNextBonusLevel(GAME_ID, level)

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

  const availableWrongColors = useMemo(() => {
    const colors = ["red"]
    diff.extraColors.forEach((c) => { if (!colors.includes(c)) colors.push(c) })
    return colors
  }, [diff.extraColors])

  const buildFields = useCallback((count: number, wrongColors: string[]): Field[] => {
    const greenIdx = Math.floor(Math.random() * count)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      state: i === greenIdx ? "green" as FieldState : "wrong" as FieldState,
      color: i === greenIdx ? "green" : wrongColors[Math.floor(Math.random() * wrongColors.length)],
    }))
  }, [])

  const startRound = useCallback((roundNum: number) => {
    const d = getColorDifficulty(level)
    setFeedback(null)
    setWaitingForClick(false)

    if (d.fieldCount === 1) {
      setFields([{ id: 0, state: "hidden", color: "green" }])
      const delay = d.greenDelayMin + Math.random() * (d.greenDelayMax - d.greenDelayMin)

      if (d.useDistractorColor && Math.random() < 0.3) {
        const distractDelay = delay * 0.4
        timerRef.current = setTimeout(() => {
          setFields([{ id: 0, state: "wrong", color: availableWrongColors[Math.floor(Math.random() * availableWrongColors.length)] }])
          setTimeout(() => setFields([{ id: 0, state: "hidden", color: "green" }]), 300)
        }, distractDelay)
      }

      greenTimerRef.current = setTimeout(() => {
        setFields([{ id: 0, state: "green", color: "green" }])
        setWaitingForClick(true)
      }, delay)
    } else {
      setFields(Array.from({ length: d.fieldCount }, (_, i) => ({ id: i, state: "hidden" as FieldState, color: "green" })))
      const delay = d.greenDelayMin + Math.random() * (d.greenDelayMax - d.greenDelayMin)
      greenTimerRef.current = setTimeout(() => {
        const newFields = buildFields(d.fieldCount, availableWrongColors)
        setFields(newFields)
        setWaitingForClick(true)
        if (d.greenVisibleMs > 0) {
          timerRef.current = setTimeout(() => {
            setFields((prev) => prev.map((f) => ({ ...f, state: "hidden" })))
            setWaitingForClick(false)
            setFeedback("Zu langsam!")
            setTimeout(() => advanceRound(roundNum, 0), 800)
          }, d.greenVisibleMs)
        }
      }, delay)
    }
  }, [level, availableWrongColors, buildFields])

  const advanceRound = useCallback((currentRound: number, addedScore: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (greenTimerRef.current) clearTimeout(greenTimerRef.current)
    const d = getColorDifficulty(level)
    if (currentRound + 1 >= d.rounds) {
      const totalScore = score + addedScore
      setCompleted(true)
      if (totalScore > 0) onAwardPoints(totalScore, "Alle Runden geschafft! 🎉")
    } else {
      setTimeout(() => {
        setRound(currentRound + 1)
        startRound(currentRound + 1)
      }, 600)
    }
  }, [level, score, onAwardPoints, startRound])

  const handleFieldClick = useCallback((fieldId: number) => {
    if (!waitingForClick) {
      if (fields.every((f) => f.state === "hidden")) {
        setFeedback("Warte! ⏳")
        setTimeout(() => setFeedback(null), 500)
      }
      return
    }
    setWaitingForClick(false)
    if (timerRef.current) clearTimeout(timerRef.current)

    const field = fields[fieldId]
    if (field.state === "green") {
      const newScore = score + POINTS_PER_CORRECT
      setScore(newScore)
      setFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, state: "clicked-right" } : f))
      setFeedback("Richtig! ✅")
      const result = applyXpAndGetBonuses(GAME_ID, { xp, level, bonusClaimedLevels: bonusClaimedRef.current }, XP_PER_ROUND, XP_PER_LEVEL)
      bonusClaimedRef.current = result.bonusClaimedLevels
      setLevel(result.level)
      setXp(result.xp)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: result.level, xp: result.xp, bonusClaimedLevels: result.bonusClaimedLevels })) } catch { /* ignore */ }
      if (result.bonusCoins > 0) onAwardPoints(result.bonusCoins, `Bonus: Level ${result.newBonusLevels.join(", ")} erreicht! +${result.bonusCoins} Goldmünzen`)
      if (result.leveledUp) {
        setLevelUp({ show: true, level: result.level, bonus: result.bonusCoins })
        setPendingAdvance({ round, addedScore: POINTS_PER_CORRECT })
      } else {
        advanceRound(round, POINTS_PER_CORRECT)
      }
    } else {
      setFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, state: "clicked-wrong" } : f))
      setFeedback("Falsch! ❌")
      advanceRound(round, 0)
    }
  }, [waitingForClick, fields, score, round, level, xp, onAwardPoints, advanceRound])

  const startGame = useCallback(() => {
    setRound(0); setScore(0); setCompleted(false); setGameStarted(true); setFeedback(null)
    startRound(0)
  }, [startRound])

  const handleLevelUpContinue = useCallback(() => {
    setLevelUp((p) => ({ ...p, show: false }))
    if (pendingAdvance) {
      advanceRound(pendingAdvance.round, pendingAdvance.addedScore)
      setPendingAdvance(null)
    }
  }, [pendingAdvance, advanceRound])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (greenTimerRef.current) clearTimeout(greenTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (levelUp.show) {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (greenTimerRef.current) clearTimeout(greenTimerRef.current)
    }
  }, [levelUp.show])

  const xpPercent = xpForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpForNextLevel) * 100)) : 100

  const renderField = (field: Field) => {
    const wrongColor = WRONG_COLORS[field.color] ?? DEFAULT_WRONG
    return (
      <motion.button
        key={field.id}
        type="button"
        onClick={() => handleFieldClick(field.id)}
        whileTap={{ scale: 0.95 }}
        animate={field.state === "clicked-wrong" ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        className={cn(
          "rounded-2xl border-2 transition-colors flex items-center justify-center",
          diff.fieldCount === 1 ? "w-full min-h-[280px]" : "aspect-square",
          field.state === "hidden" && "bg-muted/50 border-border",
          field.state === "green" && "bg-green-500 border-green-400",
          field.state === "wrong" && cn(wrongColor.bg, wrongColor.border),
          field.state === "clicked-right" && "bg-green-600 border-green-500",
          field.state === "clicked-wrong" && "bg-red-500/40 border-red-500",
        )}
      >
        {field.state === "hidden" && <span className="text-lg text-muted-foreground">{diff.fieldCount === 1 ? "Warte auf GRÜN..." : "?"}</span>}
        {field.state === "green" && <span className={cn("font-bold text-white", diff.fieldCount === 1 ? "text-3xl" : "text-xl")}>GRÜN! 👆</span>}
        {field.state === "wrong" && <span className={cn("font-bold", wrongColor.text, diff.fieldCount === 1 ? "text-xl" : "text-sm")}>{wrongColor.label}</span>}
        {field.state === "clicked-right" && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl">✅</motion.span>}
        {field.state === "clicked-wrong" && <span className="text-2xl">❌</span>}
      </motion.button>
    )
  }

  if (completed) {
    return (
      <div className="space-y-6 text-center py-8">
        <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <p className="text-6xl mb-3">🎉</p>
          <p className="text-3xl font-bold text-foreground">Alle Runden geschafft!</p>
          <p className="text-lg font-semibold text-primary mt-1">+{score} Goldmünzen</p>
        </motion.div>
        <p className="text-base text-muted-foreground font-medium">Level {level}</p>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={onClose} variant="outline" size="lg" className="text-base bg-primary/10 hover:bg-primary/15 text-primary border-primary/20">Zurück zu den Spielen</Button>
          <Button onClick={startGame} variant="outline" size="lg" className="text-base">Nochmal spielen</Button>
          <Button onClick={() => setPhase("idle")} size="lg" className="text-base">Weiter</Button>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    return (
      <div className="space-y-5">
        <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Klicke nur auf <strong>GRÜN</strong>!</p>
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
        {diff.fieldCount > 1 && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-sm font-medium text-foreground">{diff.fieldCount} Farbfelder</p>
            <p className="text-xs text-muted-foreground">
              Nur das grüne Feld anklicken! {diff.extraColors.length > 0 && `Achtung: ${diff.extraColors.length + 1} verschiedene Farben.`}
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{diff.rounds} Runden · {POINTS_PER_CORRECT} Goldmünzen pro richtigem Klick</p>
        <Button className="w-full" size="lg" onClick={startGame}>Start</Button>
        <Button variant="outline" className="w-full" onClick={onClose}>Beenden</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Runde {round + 1}/{diff.rounds}</p>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Level {level}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>XP {xpInCurrentLevel}/{xpForNextLevel || "Max"}</span>
          {nextBonusLevel && nextBonusLevel > level && <span>Bonus bei Level {nextBonusLevel}</span>}
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${xpPercent}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      {diff.fieldCount === 1 ? (
        renderField(fields[0] ?? { id: 0, state: "hidden", color: "green" })
      ) : (
        <div className={cn(
          "grid gap-3",
          diff.fieldCount <= 2 ? "grid-cols-2" : diff.fieldCount <= 4 ? "grid-cols-2" : "grid-cols-3",
        )}>
          {fields.map(renderField)}
        </div>
      )}

      <AnimatePresence>
        {feedback && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center font-bold text-base text-foreground"
          >
            {feedback}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="text-center text-muted-foreground text-sm">Goldmünzen: {score}</p>
      <Button variant="outline" className="w-full" onClick={onClose}>Beenden</Button>
    </div>
  )
}
