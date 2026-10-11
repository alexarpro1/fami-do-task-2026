"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"
import { getWordDifficulty } from "@/lib/game-difficulty"
import { LevelUpOverlay } from "./level-up-overlay"

const STORAGE_KEY = "famiapp-word-progress"
const COINS_PER_WORD = 5
const STREAK_BONUS = 10
const STREAK_THRESHOLD = 5
const XP_PER_WORD = 10
const XP_PER_LEVEL = 100
const GAME_ID = "word" as const

const CATEGORY_LABELS: Record<string, string> = {
  tiere: "Tiere",
  farben: "Farben",
  schule: "Schule",
  essen: "Essen & Trinken",
  haushalt: "Haushalt",
  natur: "Natur",
  koerper: "Körper",
  familie: "Familie & Zuhause",
  mathe: "Mathe & Zahlen",
  zahlen: "Zahlen",
}

type WordEntry = { word: string; category: string; emoji: string }

/** Autonom generierte Wörter: Zahlwörter (1–20) und Mathe-Begriffe, gefiltert nach Länge. */
function getGeneratedWords(minLen: number, maxLen: number): WordEntry[] {
  const numberWords: WordEntry[] = [
    { word: "Eins", category: "zahlen", emoji: "1️⃣" },
    { word: "Zwei", category: "zahlen", emoji: "2️⃣" },
    { word: "Drei", category: "zahlen", emoji: "3️⃣" },
    { word: "Vier", category: "zahlen", emoji: "4️⃣" },
    { word: "Fünf", category: "zahlen", emoji: "5️⃣" },
    { word: "Sechs", category: "zahlen", emoji: "6️⃣" },
    { word: "Acht", category: "zahlen", emoji: "8️⃣" },
    { word: "Neun", category: "zahlen", emoji: "9️⃣" },
    { word: "Zehn", category: "zahlen", emoji: "🔟" },
    { word: "Elf", category: "zahlen", emoji: "1️⃣1️⃣" },
    { word: "Zwölf", category: "zahlen", emoji: "1️⃣2️⃣" },
    { word: "Sieben", category: "zahlen", emoji: "7️⃣" },
    { word: "Null", category: "mathe", emoji: "0️⃣" },
  ]
  const mathWords: WordEntry[] = [
    { word: "Plus", category: "mathe", emoji: "➕" },
    { word: "Mal", category: "mathe", emoji: "✖️" },
    { word: "Summe", category: "mathe", emoji: "📊" },
    { word: "Zahl", category: "mathe", emoji: "🔢" },
    { word: "Minus", category: "mathe", emoji: "➖" },
    { word: "Bruch", category: "mathe", emoji: "½" },
    { word: "Punkt", category: "mathe", emoji: "•" },
    { word: "Linie", category: "mathe", emoji: "📐" },
    { word: "Form", category: "mathe", emoji: "⬡" },
    { word: "Gleich", category: "mathe", emoji: "🟰" },
    { word: "Rechnen", category: "mathe", emoji: "🧮" },
    { word: "Lösung", category: "mathe", emoji: "✅" },
    { word: "Geteilt", category: "mathe", emoji: "➗" },
    { word: "Klammer", category: "mathe", emoji: "📎" },
    { word: "Ergebnis", category: "mathe", emoji: "🎯" },
    { word: "Dreizehn", category: "zahlen", emoji: "1️⃣3️⃣" },
    { word: "Vierzehn", category: "zahlen", emoji: "1️⃣4️⃣" },
    { word: "Fünfzehn", category: "zahlen", emoji: "1️⃣5️⃣" },
    { word: "Sechzehn", category: "zahlen", emoji: "1️⃣6️⃣" },
    { word: "Siebzehn", category: "zahlen", emoji: "1️⃣7️⃣" },
    { word: "Achtzehn", category: "zahlen", emoji: "1️⃣8️⃣" },
    { word: "Neunzehn", category: "zahlen", emoji: "1️⃣9️⃣" },
    { word: "Zwanzig", category: "zahlen", emoji: "2️⃣0️⃣" },
  ]
  const pool = [...numberWords, ...mathWords]
  return pool.filter((e) => {
    const len = e.word.length
    return len >= minLen && len <= maxLen
  })
}

const WORD_LIST: { word: string; category: string; emoji: string }[] = [
  { word: "Maus", category: "tiere", emoji: "🐭" },
  { word: "Hund", category: "tiere", emoji: "🐶" },
  { word: "Katze", category: "tiere", emoji: "🐱" },
  { word: "Vogel", category: "tiere", emoji: "🐦" },
  { word: "Fisch", category: "tiere", emoji: "🐟" },
  { word: "Pferd", category: "tiere", emoji: "🐴" },
  { word: "Biene", category: "tiere", emoji: "🐝" },
  { word: "Schaf", category: "tiere", emoji: "🐑" },
  { word: "Frosch", category: "tiere", emoji: "🐸" },
  { word: "Tiger", category: "tiere", emoji: "🐯" },
  { word: "Bär", category: "tiere", emoji: "🐻" },
  { word: "Hase", category: "tiere", emoji: "🐰" },
  { word: "Ente", category: "tiere", emoji: "🦆" },
  { word: "Igel", category: "tiere", emoji: "🦔" },
  { word: "Wurm", category: "tiere", emoji: "🪱" },
  { word: "Eule", category: "tiere", emoji: "🦉" },
  { word: "Löwe", category: "tiere", emoji: "🦁" },
  { word: "Wolf", category: "tiere", emoji: "🐺" },
  { word: "Zebra", category: "tiere", emoji: "🦓" },
  { word: "Giraffe", category: "tiere", emoji: "🦒" },
  { word: "Rot", category: "farben", emoji: "🔴" },
  { word: "Blau", category: "farben", emoji: "🔵" },
  { word: "Grün", category: "farben", emoji: "🟢" },
  { word: "Gelb", category: "farben", emoji: "🟡" },
  { word: "Rosa", category: "farben", emoji: "🩷" },
  { word: "Lila", category: "farben", emoji: "🟣" },
  { word: "Gold", category: "farben", emoji: "⭐" },
  { word: "Weiß", category: "farben", emoji: "⬜" },
  { word: "Orange", category: "farben", emoji: "🟠" },
  { word: "Braun", category: "farben", emoji: "🟤" },
  { word: "Grau", category: "farben", emoji: "⬛" },
  { word: "Buch", category: "schule", emoji: "📖" },
  { word: "Stift", category: "schule", emoji: "✏️" },
  { word: "Tafel", category: "schule", emoji: "🎓" },
  { word: "Heft", category: "schule", emoji: "📓" },
  { word: "Stuhl", category: "schule", emoji: "🪑" },
  { word: "Tisch", category: "schule", emoji: "🪵" },
  { word: "Kreide", category: "schule", emoji: "🖍️" },
  { word: "Pause", category: "schule", emoji: "⏸️" },
  { word: "Klasse", category: "schule", emoji: "🏫" },
  { word: "Radier", category: "schule", emoji: "🧽" },
  { word: "Rucksack", category: "schule", emoji: "🎒" },
  { word: "Lineal", category: "schule", emoji: "📏" },
  { word: "Apfel", category: "essen", emoji: "🍎" },
  { word: "Brot", category: "essen", emoji: "🍞" },
  { word: "Milch", category: "essen", emoji: "🥛" },
  { word: "Käse", category: "essen", emoji: "🧀" },
  { word: "Ei", category: "essen", emoji: "🥚" },
  { word: "Suppe", category: "essen", emoji: "🍲" },
  { word: "Kuchen", category: "essen", emoji: "🍰" },
  { word: "Banane", category: "essen", emoji: "🍌" },
  { word: "Pizza", category: "essen", emoji: "🍕" },
  { word: "Nudel", category: "essen", emoji: "🍝" },
  { word: "Reis", category: "essen", emoji: "🍚" },
  { word: "Salat", category: "essen", emoji: "🥗" },
  { word: "Honig", category: "essen", emoji: "🍯" },
  { word: "Wasser", category: "essen", emoji: "💧" },
  { word: "Zitrone", category: "essen", emoji: "🍋" },
  { word: "Tomate", category: "essen", emoji: "🍅" },
  { word: "Karotte", category: "essen", emoji: "🥕" },
  { word: "Lampe", category: "haushalt", emoji: "💡" },
  { word: "Tür", category: "haushalt", emoji: "🚪" },
  { word: "Bett", category: "haushalt", emoji: "🛏️" },
  { word: "Sofa", category: "haushalt", emoji: "🛋️" },
  { word: "Uhr", category: "haushalt", emoji: "🕐" },
  { word: "Topf", category: "haushalt", emoji: "🍳" },
  { word: "Tasse", category: "haushalt", emoji: "☕" },
  { word: "Spiegel", category: "haushalt", emoji: "🪞" },
  { word: "Fenster", category: "haushalt", emoji: "🪟" },
  { word: "Schere", category: "haushalt", emoji: "✂️" },
  { word: "Kerze", category: "haushalt", emoji: "🕯️" },
  { word: "Blume", category: "haushalt", emoji: "🌸" },
  { word: "Besen", category: "haushalt", emoji: "🧹" },
  { word: "Schlüssel", category: "haushalt", emoji: "🔑" },
  { word: "Kissen", category: "haushalt", emoji: "🛋️" },
  { word: "Wolke", category: "natur", emoji: "☁️" },
  { word: "Sonne", category: "natur", emoji: "☀️" },
  { word: "Regen", category: "natur", emoji: "🌧️" },
  { word: "Schnee", category: "natur", emoji: "❄️" },
  { word: "Stern", category: "natur", emoji: "⭐" },
  { word: "Berg", category: "natur", emoji: "⛰️" },
  { word: "Wald", category: "natur", emoji: "🌲" },
  { word: "Fluss", category: "natur", emoji: "🏞️" },
  { word: "Meer", category: "natur", emoji: "🌊" },
  { word: "Gras", category: "natur", emoji: "🌿" },
  { word: "Stein", category: "natur", emoji: "🪨" },
  { word: "Blatt", category: "natur", emoji: "🍃" },
  { word: "Hand", category: "koerper", emoji: "✋" },
  { word: "Fuß", category: "koerper", emoji: "🦶" },
  { word: "Auge", category: "koerper", emoji: "👁️" },
  { word: "Nase", category: "koerper", emoji: "👃" },
  { word: "Ohr", category: "koerper", emoji: "👂" },
  { word: "Mund", category: "koerper", emoji: "👄" },
  { word: "Kopf", category: "koerper", emoji: "🧠" },
  { word: "Zahn", category: "koerper", emoji: "🦷" },
  { word: "Arm", category: "koerper", emoji: "💪" },
  { word: "Bein", category: "koerper", emoji: "🦵" },
  { word: "Mama", category: "familie", emoji: "👩" },
  { word: "Papa", category: "familie", emoji: "👨" },
  { word: "Oma", category: "familie", emoji: "👵" },
  { word: "Opa", category: "familie", emoji: "👴" },
  { word: "Baby", category: "familie", emoji: "👶" },
  { word: "Bruder", category: "familie", emoji: "👦" },
  { word: "Schwester", category: "familie", emoji: "👧" },
  { word: "Haus", category: "familie", emoji: "🏠" },
  { word: "Garten", category: "familie", emoji: "🌳" },
  { word: "Familie", category: "familie", emoji: "👨‍👩‍👧‍👦" },
  // Mathe & Zahlen (zusätzlich zu getGeneratedWords)
  { word: "Winkel", category: "mathe", emoji: "📐" },
  { word: "Quadrat", category: "mathe", emoji: "⬜" },
  { word: "Kreis", category: "mathe", emoji: "⭕" },
  { word: "Dreieck", category: "mathe", emoji: "🔺" },
  { word: "Rechteck", category: "mathe", emoji: "▭" },
  { word: "Meter", category: "mathe", emoji: "📏" },
  { word: "Kilo", category: "mathe", emoji: "⚖️" },
  { word: "Hälfte", category: "mathe", emoji: "½" },
  { word: "Doppel", category: "mathe", emoji: "✌️" },
  { word: "Rest", category: "mathe", emoji: "🔢" },
]

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ"

function createPuzzle(word: string, gapCount: number, choiceCount: number) {
  const upper = word.toUpperCase()
  const indices = Array.from({ length: upper.length }, (_, i) => i)
  const shuffled = indices.sort(() => Math.random() - 0.5)
  const gapIndices = shuffled.slice(0, Math.min(gapCount, upper.length))
  const correctLetters = gapIndices.map((i) => upper[i])

  const lettersSet = new Set(correctLetters)
  while (lettersSet.size < choiceCount) {
    lettersSet.add(ALPHABET[Math.floor(Math.random() * ALPHABET.length)])
  }
  const letters = Array.from(lettersSet).sort(() => Math.random() - 0.5)

  return { gapIndices: gapIndices.sort((a, b) => a - b), letters, upper }
}

interface WordBuilderGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
  onNextGame?: () => void
}

export function WordBuilderGame({ onAwardPoints, onClose, onNextGame }: WordBuilderGameProps) {
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const bonusClaimedRef = useRef<number[]>([])
  const [levelUp, setLevelUp] = useState<{ show: boolean; level: number; bonus: number }>({ show: false, level: 0, bonus: 0 })
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pendingAdvance, setPendingAdvance] = useState(false)

  const diff = getWordDifficulty(level)
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle")
  const [wordIdx, setWordIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [roundWords, setRoundWords] = useState<WordEntry[]>([])
  const [puzzle, setPuzzle] = useState<ReturnType<typeof createPuzzle> | null>(null)
  const [filled, setFilled] = useState<Record<number, string>>({})
  const [currentGapIdx, setCurrentGapIdx] = useState(0)
  const [shake, setShake] = useState(false)
  const [wordEmoji, setWordEmoji] = useState("")
  const currentWord = roundWords[wordIdx]

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

  const filteredWords = useMemo(() => {
    const [minLen, maxLen] = diff.wordLength
    return WORD_LIST.filter((w) => w.word.length >= minLen && w.word.length <= maxLen)
  }, [diff.wordLength])

  const startGame = useCallback(() => {
    const d = getWordDifficulty(level)
    const [minLen, maxLen] = d.wordLength
    const generated = getGeneratedWords(minLen, maxLen)
    const combined = [...filteredWords, ...generated].filter(
      (e, i, arr) => arr.findIndex((x) => x.word.toUpperCase() === e.word.toUpperCase()) === i
    )
    const pool = combined.sort(() => Math.random() - 0.5).slice(0, d.wordsPerRound)
    if (pool.length === 0) return
    setRoundWords(pool)
    setWordIdx(0); setCorrectCount(0); setStreak(0); setPhase("playing")
    const p = createPuzzle(pool[0].word, d.gaps, d.choiceCount)
    setPuzzle(p); setFilled({}); setCurrentGapIdx(0); setWordEmoji("")
  }, [filteredWords, level])

  const advanceWord = useCallback(() => {
    if (wordIdx + 1 >= roundWords.length) {
      setPhase("done"); return
    }
    const nextWordIdx = wordIdx + 1
    setWordIdx(nextWordIdx)
    const d = getWordDifficulty(level)
    const p = createPuzzle(roundWords[nextWordIdx].word, d.gaps, d.choiceCount)
    setPuzzle(p); setFilled({}); setCurrentGapIdx(0); setWordEmoji("")
  }, [wordIdx, roundWords, level])

  useEffect(() => {
    if (levelUp.show && advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current)
      advanceTimeoutRef.current = null
    }
  }, [levelUp.show])

  const handleLevelUpContinue = useCallback(() => {
    setLevelUp((p) => ({ ...p, show: false }))
    if (pendingAdvance) {
      setPendingAdvance(false)
      advanceWord()
    }
  }, [pendingAdvance, advanceWord])

  const handleLetter = useCallback((letter: string) => {
    if (!puzzle || phase !== "playing") return
    const gapPos = puzzle.gapIndices[currentGapIdx]
    if (gapPos == null) return

    if (letter === puzzle.upper[gapPos]) {
      const newFilled = { ...filled, [gapPos]: letter }
      setFilled(newFilled)

      if (currentGapIdx + 1 >= puzzle.gapIndices.length) {
        const newStreak = streak + 1
        setStreak(newStreak)
        setCorrectCount((c) => c + 1)
        setWordEmoji(currentWord?.emoji ?? "")
        onAwardPoints(COINS_PER_WORD, `${currentWord?.word} richtig! ${currentWord?.emoji}`)

        if (newStreak > 0 && newStreak % STREAK_THRESHOLD === 0) {
          onAwardPoints(STREAK_BONUS, `${STREAK_THRESHOLD}er Serie! +${STREAK_BONUS} Bonus`)
        }

        const result = applyXpAndGetBonuses(GAME_ID, { xp, level, bonusClaimedLevels: bonusClaimedRef.current }, XP_PER_WORD, XP_PER_LEVEL)
        bonusClaimedRef.current = result.bonusClaimedLevels
        setLevel(result.level)
        setXp(result.xp)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: result.level, xp: result.xp, bonusClaimedLevels: result.bonusClaimedLevels })) } catch { /* ignore */ }
        if (result.bonusCoins > 0) onAwardPoints(result.bonusCoins, `Bonus: Level ${result.newBonusLevels.join(", ")} erreicht!`)
        if (result.leveledUp) {
          setLevelUp({ show: true, level: result.level, bonus: result.bonusCoins })
          setPendingAdvance(true)
        } else {
          advanceTimeoutRef.current = setTimeout(advanceWord, 900)
        }
      } else {
        setCurrentGapIdx(currentGapIdx + 1)
      }
    } else {
      setStreak(0)
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
  }, [puzzle, phase, currentGapIdx, filled, streak, currentWord, onAwardPoints, level, xp, advanceWord])

  const xpPercent = xpForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpForNextLevel) * 100)) : 100

  if (phase === "done") {
    return (
      <div className="space-y-6 text-center py-6 sm:py-8 px-2 max-w-lg mx-auto">
        <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <p className="text-5xl sm:text-6xl mb-3" role="img" aria-hidden>{correctCount === roundWords.length ? "🏆" : "📝"}</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{correctCount}/{roundWords.length} Wörter!</p>
          <p className="text-base sm:text-lg font-semibold text-primary mt-1">+{correctCount * COINS_PER_WORD} Goldmünzen</p>
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
          <p className="text-sm sm:text-base text-muted-foreground">Fülle die fehlenden Buchstaben!</p>
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
          <p>{diff.wordsPerRound} Wörter pro Runde · {COINS_PER_WORD} Goldmünzen pro Wort</p>
          <p>+{STREAK_BONUS} Bonus für {STREAK_THRESHOLD} richtige in Folge</p>
          <p>{diff.gaps} Lücke{diff.gaps > 1 ? "n" : ""} pro Wort · {diff.choiceCount} Buchstaben · inkl. Mathe & Zahlen</p>
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
        <p className="text-sm sm:text-base text-muted-foreground">
          Wort {wordIdx + 1}/{roundWords.length}
          {streak >= 3 && <span className="text-primary font-bold ml-1">· {streak}er Serie 🔥</span>}
        </p>
        <span className="text-xs sm:text-sm font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Level {level}</span>
      </div>

      {currentWord && (
        <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-muted/30 border border-border">
          <span className="text-3xl sm:text-4xl" role="img" aria-hidden>{currentWord.emoji}</span>
          <span className="text-sm sm:text-base font-medium text-muted-foreground">
            {CATEGORY_LABELS[currentWord.category] ?? currentWord.category}
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {puzzle && (
          <motion.div
            key={wordIdx}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-border bg-card/50 p-4 sm:p-5"
          >
            {wordEmoji ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="text-center py-8 sm:py-10"
              >
                <p className="text-5xl sm:text-6xl mb-2" role="img" aria-hidden>{wordEmoji}</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{currentWord?.word}</p>
              </motion.div>
            ) : (
              <>
                <motion.div
                  animate={shake ? { x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } } : {}}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 py-6 sm:py-8 flex-wrap"
                >
                  {puzzle.upper.split("").map((char, i) => {
                    const isGap = puzzle.gapIndices.includes(i)
                    const filledChar = filled[i]
                    const isActive = isGap && puzzle.gapIndices[currentGapIdx] === i
                    return (
                      <div
                        key={i}
                        className={cn(
                          "min-w-[2.25rem] w-10 sm:w-12 h-12 sm:h-14 rounded-lg border-2 flex items-center justify-center text-xl sm:text-2xl font-bold transition-all",
                          isGap && !filledChar && isActive && "border-primary bg-primary/10 ring-2 ring-primary/30",
                          isGap && !filledChar && !isActive && "border-dashed border-muted-foreground/40 bg-muted/30",
                          isGap && filledChar && "border-primary bg-primary/20 text-primary",
                          !isGap && "border-transparent text-foreground",
                        )}
                      >
                        {isGap ? (filledChar || "") : char}
                      </div>
                    )
                  })}
                </motion.div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  {puzzle.letters.map((letter, i) => (
                    <motion.button
                      key={`${letter}-${i}`}
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleLetter(letter)}
                      className="min-h-[48px] w-12 sm:w-14 h-12 sm:h-14 rounded-xl border-2 border-border bg-muted/50 hover:bg-muted text-lg sm:text-xl font-bold text-foreground transition-colors active:scale-[0.98]"
                    >
                      {letter}
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-sm text-muted-foreground">{correctCount} richtig</p>
      <Button variant="outline" className="w-full min-h-[48px] text-base" onClick={onClose}>Beenden</Button>
    </div>
  )
}
