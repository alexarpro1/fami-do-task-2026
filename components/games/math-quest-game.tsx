"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"
import { getMathDifficulty, type MathOp } from "@/lib/game-difficulty"
import { LevelUpOverlay } from "./level-up-overlay"

const STORAGE_KEY = "famiapp-math-progress"
const COINS_PER_CORRECT = 3
const PERFECT_BONUS = 10
const XP_PER_CORRECT = 8
const XP_PER_LEVEL = 100
const GAME_ID = "math" as const

interface MathQuestGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
  onNextGame?: () => void
}

const OPERATION_LABELS: Record<MathOp, string> = {
  add: "Addition",
  sub: "Subtraktion",
  mul: "Multiplikation",
  div: "Division",
}

const EMOJI_OBJECTS = ["🍎", "⭐", "🔵", "🌸", "🐱", "🚗", "📚", "🪴"]

interface Question {
  text: string
  answer: number
  options: number[]
  label: string
  op: MathOp
  /** Optional: gleiche Aufgabe als Wort oder mit Emojis */
  wordStyle?: string
  emojiLine?: string
}

function generateQuestion(ops: MathOp[], maxNum: number): Question {
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a: number, b: number, answer: number, text: string
  let wordStyle: string | undefined
  let emojiLine: string | undefined

  switch (op) {
    case "add": {
      a = Math.floor(Math.random() * maxNum) + 1
      b = Math.floor(Math.random() * maxNum) + 1
      answer = a + b
      text = `${a} + ${b}`
      if (maxNum <= 20 && Math.random() > 0.5) {
        const emoji = EMOJI_OBJECTS[Math.floor(Math.random() * EMOJI_OBJECTS.length)]
        emojiLine = Array(a).fill(emoji).join("") + " + " + Array(b).fill(emoji).join("")
        wordStyle = `${a} und ${b} zusammenzählen`
      }
      break
    }
    case "sub": {
      a = Math.floor(Math.random() * maxNum) + 1
      b = Math.floor(Math.random() * a) + 1
      answer = a - b
      text = `${a} − ${b}`
      if (maxNum <= 20 && Math.random() > 0.5) {
        wordStyle = `Von ${a} noch ${b} wegnommen`
      }
      break
    }
    case "mul": {
      a = Math.floor(Math.random() * Math.min(12, maxNum)) + 1
      b = Math.floor(Math.random() * Math.min(12, maxNum)) + 1
      answer = a * b
      text = `${a} × ${b}`
      if (Math.random() > 0.6) wordStyle = `${a} mal ${b}`
      break
    }
    case "div": {
      b = Math.floor(Math.random() * Math.min(12, maxNum)) + 1
      answer = Math.floor(Math.random() * Math.min(12, maxNum)) + 1
      a = answer * b
      text = `${a} ÷ ${b}`
      if (Math.random() > 0.6) wordStyle = `${a} geteilt durch ${b}`
      break
    }
    default:
      a = 1; b = 1; answer = 2; text = "1 + 1"
  }

  const optionsSet = new Set<number>([answer])
  while (optionsSet.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5
    const fake = answer + (offset === 0 ? 1 : offset)
    if (fake >= 0) optionsSet.add(fake)
  }
  const options = Array.from(optionsSet).sort(() => Math.random() - 0.5)

  return {
    text,
    answer,
    options,
    label: OPERATION_LABELS[op],
    op,
    wordStyle,
    emojiLine,
  }
}

export function MathQuestGame({ onAwardPoints, onClose, onNextGame }: MathQuestGameProps) {
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const bonusClaimedRef = useRef<number[]>([])
  const [levelUp, setLevelUp] = useState<{ show: boolean; level: number; bonus: number }>({ show: false, level: 0, bonus: 0 })
  const [pendingAdvance, setPendingAdvance] = useState<{ currentIdx: number; correct: number; questionsLength: number } | null>(null)

  const diff = getMathDifficulty(level)
  const [phase, setPhase] = useState<"idle" | "playing" | "feedback" | "done">("idle")
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const startGame = useCallback(() => {
    const d = getMathDifficulty(level)
    const qs = Array.from({ length: d.questionsPerRound }, () => generateQuestion(d.operations, d.maxNumber))
    setQuestions(qs)
    setCurrentIdx(0); setCorrect(0); setSelectedAnswer(null); setPhase("playing")
    setTimeLeft(d.timerSec)
  }, [level])

  useEffect(() => {
    if (levelUp.show && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [levelUp.show])

  useEffect(() => {
    if (phase !== "playing" || levelUp.show) return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleAnswer(-1)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, levelUp.show])

  const doAdvance = useCallback((idx: number, totalCorrect: number, qLen: number) => {
    setTimeout(() => {
      if (idx + 1 >= qLen) {
        if (totalCorrect === qLen) {
          onAwardPoints(PERFECT_BONUS, `Perfekt! Alle ${qLen} richtig! +${PERFECT_BONUS} Bonus`)
        }
        setPhase("done")
      } else {
        setCurrentIdx((i) => i + 1)
        setSelectedAnswer(null)
        setPhase("playing")
        setTimeLeft(getMathDifficulty(level).timerSec)
      }
    }, 800)
  }, [level, onAwardPoints])

  const handleAnswer = useCallback((answer: number) => {
    if (phase !== "playing") return
    if (timerRef.current) clearInterval(timerRef.current)
    const q = questions[currentIdx]
    const isRight = answer === q?.answer
    setSelectedAnswer(answer)
    setIsCorrectAnswer(isRight)
    setPhase("feedback")

    if (isRight) {
      const newCorrect = correct + 1
      setCorrect(newCorrect)
      onAwardPoints(COINS_PER_CORRECT, "Richtig! 🎯")
      const result = applyXpAndGetBonuses(GAME_ID, { xp, level, bonusClaimedLevels: bonusClaimedRef.current }, XP_PER_CORRECT, XP_PER_LEVEL)
      bonusClaimedRef.current = result.bonusClaimedLevels
      setLevel(result.level)
      setXp(result.xp)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: result.level, xp: result.xp, bonusClaimedLevels: result.bonusClaimedLevels })) } catch { /* ignore */ }
      if (result.bonusCoins > 0) onAwardPoints(result.bonusCoins, `Bonus: Level ${result.newBonusLevels.join(", ")} erreicht!`)
      if (result.leveledUp) {
        setLevelUp({ show: true, level: result.level, bonus: result.bonusCoins })
        setPendingAdvance({ currentIdx, correct: newCorrect, questionsLength: questions.length })
      } else {
        doAdvance(currentIdx, newCorrect, questions.length)
      }
    } else {
      doAdvance(currentIdx, correct, questions.length)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, questions, correct, level, xp, onAwardPoints, doAdvance])

  const handleLevelUpContinue = useCallback(() => {
    setLevelUp((p) => ({ ...p, show: false }))
    if (pendingAdvance) {
      doAdvance(pendingAdvance.currentIdx, pendingAdvance.correct, pendingAdvance.questionsLength)
      setPendingAdvance(null)
    }
  }, [pendingAdvance, doAdvance])

  const xpPercent = xpForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpForNextLevel) * 100)) : 100
  const timerPercent = diff.timerSec > 0 ? Math.max(0, (timeLeft / diff.timerSec) * 100) : 0
  const currentQ = questions[currentIdx]

  if (phase === "done") {
    const totalCoins = correct * COINS_PER_CORRECT + (correct === questions.length ? PERFECT_BONUS : 0)
    return (
      <div className="space-y-6 text-center py-6 sm:py-8 px-2 max-w-lg mx-auto">
        <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <p className="text-5xl sm:text-6xl mb-3" role="img" aria-hidden>{correct === questions.length ? "🏆" : correct > 0 ? "👍" : "😅"}</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{correct}/{questions.length} richtig!</p>
          <p className="text-base sm:text-lg font-semibold text-primary mt-1">+{totalCoins} Goldmünzen</p>
        </motion.div>
        <p className="text-sm sm:text-base text-muted-foreground font-medium">Level {level}</p>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={onClose} variant="outline" size="lg" className="text-base min-h-[48px] bg-primary/10 hover:bg-primary/15 text-primary border-primary/20">Zurück zu den Spielen</Button>
          <Button onClick={startGame} variant="outline" size="lg" className="text-base min-h-[48px]">Nochmal spielen</Button>
          <Button onClick={() => setPhase("idle")} size="lg" className="text-base min-h-[48px]">Weiter</Button>
        </div>
      </div>
    )
  }

  if (phase === "idle") {
    return (
      <div className="space-y-5 px-2 max-w-lg mx-auto">
        <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm sm:text-base text-muted-foreground">Mathe-Rätsel mit {diff.questionsPerRound} Fragen</p>
          <span className="text-xs sm:text-sm font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Level {level}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
            <span>XP {xpInCurrentLevel}/{xpForNextLevel || "Max"}</span>
            {nextBonusLevel && nextBonusLevel > level && <span>Bonus bei Level {nextBonusLevel}</span>}
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground space-y-1.5">
          <p>{COINS_PER_CORRECT} Goldmünzen pro richtige Antwort</p>
          <p>+{PERFECT_BONUS} Bonus für fehlerfreie Runde</p>
          <p>{diff.timerSec}s pro Aufgabe · Addition, Subtraktion, Mal, Geteilt</p>
        </div>
        <Button className="w-full min-h-[48px] text-base" size="lg" onClick={startGame}>Start</Button>
        <Button variant="outline" className="w-full min-h-[48px] text-base" onClick={onClose}>Beenden</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5 px-2 max-w-lg mx-auto">
      <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm sm:text-base text-muted-foreground">Frage {currentIdx + 1}/{questions.length}</p>
        <span className="text-xs sm:text-sm font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Level {level}</span>
      </div>

      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", timeLeft <= 3 ? "bg-red-500" : "bg-primary")}
          animate={{ width: `${timerPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className={cn("text-center text-sm sm:text-base font-medium", timeLeft <= 3 ? "text-red-500" : "text-muted-foreground")}>{timeLeft}s</p>

      {currentQ && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-border bg-card/50 p-4 sm:p-5"
          >
            <p className="text-center text-xs sm:text-sm font-medium text-primary uppercase tracking-wide mb-2 sm:mb-3">
              {currentQ.label}
            </p>
            {currentQ.emojiLine && (
              <p className="text-center text-lg sm:text-xl md:text-2xl text-muted-foreground mb-2 break-all" aria-hidden>
                {currentQ.emojiLine}
              </p>
            )}
            {currentQ.wordStyle && !currentQ.emojiLine && (
              <p className="text-center text-sm sm:text-base text-muted-foreground mb-1">{currentQ.wordStyle}</p>
            )}
            <p className="text-center text-2xl sm:text-3xl md:text-4xl font-bold text-foreground py-4 sm:py-6">
              {currentQ.text} = ?
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {currentQ.options.map((opt) => {
                const isFeedback = phase === "feedback"
                const isSelected = selectedAnswer === opt
                const isAnswer = opt === currentQ.answer
                const isCorrectChoice = isFeedback && isSelected && isCorrectAnswer
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    disabled={isFeedback}
                    onClick={() => handleAnswer(opt)}
                    whileTap={!isFeedback ? { scale: 0.96 } : {}}
                    animate={
                      isFeedback && isSelected && !isCorrectAnswer
                        ? { x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } }
                        : isCorrectChoice
                          ? { scale: [1, 1.05, 1], transition: { duration: 0.35 } }
                          : {}
                    }
                    className={cn(
                      "min-h-[52px] sm:min-h-[60px] rounded-xl border-2 text-lg sm:text-xl md:text-2xl font-bold transition-colors",
                      isFeedback && isAnswer && "bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/30",
                      isFeedback && isSelected && !isCorrectAnswer && "bg-red-500/30 border-red-500",
                      !isFeedback && "bg-muted/50 border-border hover:bg-muted active:scale-[0.98]",
                    )}
                  >
                    {opt}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <p className="text-center text-sm text-muted-foreground">{correct} richtig</p>
      <Button variant="outline" className="w-full min-h-[48px] text-base" onClick={onClose}>Beenden</Button>
    </div>
  )
}
