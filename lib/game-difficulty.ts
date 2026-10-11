import { MAX_GAME_LEVEL } from "./game-progression"

function lerp(min: number, max: number, t: number): number {
  return Math.round(min + (max - min) * Math.min(1, Math.max(0, t)))
}

function progress(level: number): number {
  return (level - 1) / (MAX_GAME_LEVEL - 1)
}

// ---------- Reaction ----------
export interface ReactionDifficulty {
  delayMin: number
  delayMax: number
  fastThresholdMs: number
  medThresholdMs: number
}

export function getReactionDifficulty(level: number): ReactionDifficulty {
  const t = progress(level)
  return {
    delayMin: lerp(2000, 800, t),
    delayMax: lerp(5000, 2000, t),
    fastThresholdMs: lerp(400, 280, t),
    medThresholdMs: lerp(600, 420, t),
  }
}

// ---------- Memory ----------
export interface MemoryDifficulty {
  pairs: number
  peekMs: number
  mismatchDelayMs: number
  gridCols: number
}

export function getMemoryDifficulty(level: number): MemoryDifficulty {
  const t = progress(level)
  const pairs = t < 0.2 ? 4 : t < 0.5 ? 6 : 8
  const gridCols = pairs <= 4 ? 4 : pairs <= 6 ? 3 : 4
  return {
    pairs,
    peekMs: t >= 0.8 ? 0 : lerp(1500, 300, t),
    mismatchDelayMs: lerp(600, 400, t),
    gridCols,
  }
}

// ---------- Tap ----------
export interface TapDifficulty {
  targetTaps: number
  fastThresholdSec: number
  medThresholdSec: number
  /** Number of buttons shown simultaneously; player must tap the highlighted one */
  buttonCount: number
  /** How fast the highlight switches between buttons (ms) */
  switchIntervalMs: number
  /** Whether the buttons shuffle positions between taps */
  shufflePositions: boolean
  /** Whether there's a shrinking button size */
  shrinkButtons: boolean
}

export function getTapDifficulty(level: number): TapDifficulty {
  const t = progress(level)
  let buttonCount = 1
  if (level >= 5) buttonCount = 2
  if (level >= 10) buttonCount = 3
  if (level >= 20) buttonCount = 4
  if (level >= 35) buttonCount = 5

  return {
    targetTaps: lerp(15, 35, t),
    fastThresholdSec: lerp(12, 7, t),
    medThresholdSec: lerp(17, 11, t),
    buttonCount,
    switchIntervalMs: buttonCount > 1 ? lerp(2000, 800, t) : 0,
    shufflePositions: level >= 15,
    shrinkButtons: level >= 30,
  }
}

// ---------- Color Click ----------
export interface ColorDifficulty {
  rounds: number
  greenDelayMin: number
  greenDelayMax: number
  useDistractorColor: boolean
  /** Number of color fields shown at once; only 1 is green */
  fieldCount: number
  /** How long the green field stays visible (ms); 0 = until clicked */
  greenVisibleMs: number
  /** Extra wrong colors beyond red (e.g. orange, blue) */
  extraColors: string[]
}

export function getColorDifficulty(level: number): ColorDifficulty {
  const t = progress(level)
  let fieldCount = 1
  if (level >= 5) fieldCount = 2
  if (level >= 10) fieldCount = 3
  if (level >= 20) fieldCount = 4
  if (level >= 35) fieldCount = 5
  if (level >= 45) fieldCount = 6

  const extraColors: string[] = []
  if (level >= 15) extraColors.push("orange")
  if (level >= 25) extraColors.push("blue")
  if (level >= 40) extraColors.push("purple")

  return {
    rounds: lerp(5, 14, t),
    greenDelayMin: lerp(1000, 400, t),
    greenDelayMax: lerp(3000, 1200, t),
    useDistractorColor: level >= 15,
    fieldCount,
    greenVisibleMs: fieldCount > 1 ? lerp(3000, 1000, t) : 0,
    extraColors,
  }
}

// ---------- MathQuest ----------
export type MathOp = "add" | "sub" | "mul" | "div"

export interface MathDifficulty {
  operations: MathOp[]
  maxNumber: number
  timerSec: number
  questionsPerRound: number
}

export function getMathDifficulty(level: number): MathDifficulty {
  if (level <= 10) return { operations: ["add", "sub"], maxNumber: 20, timerSec: 15, questionsPerRound: 5 }
  if (level <= 20) return { operations: ["add", "sub", "mul"], maxNumber: 50, timerSec: 12, questionsPerRound: 7 }
  if (level <= 35) return { operations: ["add", "sub", "mul", "div"], maxNumber: 80, timerSec: 10, questionsPerRound: 8 }
  return { operations: ["add", "sub", "mul", "div"], maxNumber: 100, timerSec: 8, questionsPerRound: 10 }
}

// ---------- WordBuilder ----------
export interface WordDifficulty {
  wordLength: [number, number]
  gaps: number
  choiceCount: number
  /** Anzahl Wörter pro Runde */
  wordsPerRound: number
}

export function getWordDifficulty(level: number): WordDifficulty {
  if (level <= 10) return { wordLength: [3, 4], gaps: 1, choiceCount: 5, wordsPerRound: 10 }
  if (level <= 20) return { wordLength: [4, 5], gaps: 2, choiceCount: 6, wordsPerRound: 12 }
  if (level <= 35) return { wordLength: [5, 6], gaps: 2, choiceCount: 7, wordsPerRound: 14 }
  return { wordLength: [6, 8], gaps: 3, choiceCount: 8, wordsPerRound: 16 }
}

// ---------- MoleDash ----------
export interface MoleDifficulty {
  gridSize: number
  gridCols: number
  concurrentMoles: number
  activeDurationMs: number
  pauseDurationMs: number
  rounds: number
}

export function getMoleDifficulty(level: number): MoleDifficulty {
  if (level < 5) return { gridSize: 6, gridCols: 3, concurrentMoles: 1, activeDurationMs: 1200, pauseDurationMs: 800, rounds: 5 }
  if (level < 10) return { gridSize: 6, gridCols: 3, concurrentMoles: 1, activeDurationMs: 1000, pauseDurationMs: 700, rounds: 7 }
  if (level < 15) return { gridSize: 9, gridCols: 3, concurrentMoles: 1, activeDurationMs: 900, pauseDurationMs: 650, rounds: 8 }
  if (level < 20) return { gridSize: 9, gridCols: 3, concurrentMoles: 2, activeDurationMs: 800, pauseDurationMs: 600, rounds: 10 }
  if (level < 30) return { gridSize: 9, gridCols: 3, concurrentMoles: 2, activeDurationMs: 750, pauseDurationMs: 550, rounds: 12 }
  if (level < 40) return { gridSize: 12, gridCols: 4, concurrentMoles: 2, activeDurationMs: 700, pauseDurationMs: 500, rounds: 14 }
  return { gridSize: 12, gridCols: 4, concurrentMoles: 3, activeDurationMs: 600, pauseDurationMs: 400, rounds: 18 }
}
