/**
 * Klassenstufen-Curriculum für Lernspiele (Mathe, Wörter, Memory).
 * Themen schalten alle 10 Level frei (Decade). Klasse 1–5.
 */

import type { SchoolGrade } from "@/types"
import type { MathExerciseMode, MathOp, MemoryExerciseMode, MemoryMotifSet, WordExerciseMode, WordPoolId } from "./game-difficulty"

export type { SchoolGrade }

export const SCHOOL_GRADES: SchoolGrade[] = [1, 2, 3, 4, 5]

/** Level, ab dem die Klassenstufe im Spiel wählbar ist. */
export const GRADE_UNLOCK_LEVEL: Record<SchoolGrade, number> = {
  1: 1,
  2: 10,
  3: 25,
  4: 50,
  5: 100,
}

export function normalizeSchoolGrade(value: unknown): SchoolGrade {
  const n = typeof value === "number" ? value : Number(value)
  if (n === 2 || n === 3 || n === 4 || n === 5) return n
  return 1
}

/** Decade = floor((level-1)/10) → alle 10 Level ein Themen-Schritt. */
export function getCurriculumDecade(level: number): number {
  const safe = Math.max(1, Number.isFinite(level) ? Math.floor(level) : 1)
  return Math.floor((safe - 1) / 10)
}

export function isSchoolGradeUnlocked(grade: SchoolGrade, gameLevel: number): boolean {
  return Math.max(1, gameLevel) >= GRADE_UNLOCK_LEVEL[grade]
}

export function getUnlockedSchoolGrades(gameLevel: number): SchoolGrade[] {
  return SCHOOL_GRADES.filter((g) => isSchoolGradeUnlocked(g, gameLevel))
}

/** Effektive Klasse: Override nur wenn freigeschaltet, sonst Kind-Klasse. */
export function resolveEffectiveSchoolGrade(
  gameLevel: number,
  childGrade: SchoolGrade | undefined | null,
  preferredOverride: SchoolGrade | undefined | null,
): SchoolGrade {
  const base = normalizeSchoolGrade(childGrade)
  if (preferredOverride != null) {
    const pref = normalizeSchoolGrade(preferredOverride)
    if (isSchoolGradeUnlocked(pref, gameLevel)) return pref
  }
  return base
}

export function nextThemeUnlockLevel(level: number): number {
  const decade = getCurriculumDecade(level)
  return (decade + 1) * 10 + 1
}

// ---------- Math ----------

export type MathThemeId =
  | "add_to_10"
  | "add_sub_to_20"
  | "add_2digit_no_carry"
  | "add_2digit_carry"
  | "add_3digit"
  | "sub_3digit"
  | "times_table"
  | "mul_div_mixed"
  | "fractions_simple"
  | "large_numbers"
  | "percent_intro"
  | "mixed_chains"
  | "word_problems"

export interface MathCurriculum {
  themeId: MathThemeId
  /** i18n key under schoolCurriculum.mathThemes.* */
  themeLabelKey: MathThemeId
  digitCount: 1 | 2 | 3 | 4
  operations: MathOp[]
  maxNumber: number
  allowCarry: boolean
  modes: MathExerciseMode[]
  chainLength: number
  questionsPerRound: number
  timerSec: number
}

type MathStep = Omit<MathCurriculum, "themeLabelKey"> & { themeId: MathThemeId }

function mathStep(partial: MathStep): MathCurriculum {
  return { ...partial, themeLabelKey: partial.themeId }
}

/** Pro Klasse eine Liste; Index = min(decade, length-1). */
const MATH_BY_GRADE: Record<SchoolGrade, MathStep[]> = {
  1: [
    { themeId: "add_to_10", digitCount: 1, operations: ["add", "sub"], maxNumber: 10, allowCarry: false, modes: ["basic"], chainLength: 0, questionsPerRound: 5, timerSec: 16 },
    { themeId: "add_sub_to_20", digitCount: 1, operations: ["add", "sub"], maxNumber: 20, allowCarry: false, modes: ["basic"], chainLength: 0, questionsPerRound: 6, timerSec: 15 },
    { themeId: "add_2digit_no_carry", digitCount: 2, operations: ["add"], maxNumber: 99, allowCarry: false, modes: ["basic"], chainLength: 0, questionsPerRound: 6, timerSec: 14 },
    { themeId: "add_2digit_carry", digitCount: 2, operations: ["add", "sub"], maxNumber: 99, allowCarry: true, modes: ["basic"], chainLength: 0, questionsPerRound: 7, timerSec: 13 },
    { themeId: "add_2digit_carry", digitCount: 2, operations: ["add", "sub"], maxNumber: 99, allowCarry: true, modes: ["basic", "word"], chainLength: 0, questionsPerRound: 8, timerSec: 12 },
  ],
  2: [
    {
      themeId: "add_2digit_carry",
      digitCount: 2,
      operations: ["add", "sub"],
      maxNumber: 99,
      allowCarry: true,
      modes: ["basic", "sequence"],
      chainLength: 0,
      questionsPerRound: 6,
      timerSec: 14,
    },
    {
      themeId: "add_3digit",
      digitCount: 3,
      operations: ["add", "sub"],
      maxNumber: 999,
      allowCarry: true,
      modes: ["basic", "sequence", "compare"],
      chainLength: 0,
      questionsPerRound: 7,
      timerSec: 13,
    },
    {
      themeId: "sub_3digit",
      digitCount: 3,
      operations: ["add", "sub"],
      maxNumber: 999,
      allowCarry: true,
      modes: ["basic", "sequence", "compare"],
      chainLength: 0,
      questionsPerRound: 7,
      timerSec: 12,
    },
    {
      themeId: "times_table",
      digitCount: 1,
      operations: ["add", "sub", "mul"],
      maxNumber: 100,
      allowCarry: true,
      modes: ["basic", "sequence", "compare"],
      chainLength: 0,
      questionsPerRound: 8,
      timerSec: 12,
    },
    {
      themeId: "mul_div_mixed",
      digitCount: 2,
      operations: ["add", "sub", "mul", "div"],
      maxNumber: 144,
      allowCarry: true,
      modes: ["basic", "sequence", "compare", "word"],
      chainLength: 0,
      questionsPerRound: 8,
      timerSec: 11,
    },
  ],
  3: [
    { themeId: "times_table", digitCount: 2, operations: ["mul", "div"], maxNumber: 144, allowCarry: true, modes: ["basic"], chainLength: 0, questionsPerRound: 7, timerSec: 12 },
    { themeId: "mul_div_mixed", digitCount: 3, operations: ["add", "sub", "mul", "div"], maxNumber: 999, allowCarry: true, modes: ["basic", "chain"], chainLength: 3, questionsPerRound: 8, timerSec: 11 },
    { themeId: "fractions_simple", digitCount: 2, operations: ["add", "sub", "mul", "div"], maxNumber: 200, allowCarry: true, modes: ["basic", "fraction"], chainLength: 0, questionsPerRound: 8, timerSec: 11 },
    { themeId: "word_problems", digitCount: 3, operations: ["add", "sub", "mul", "div"], maxNumber: 500, allowCarry: true, modes: ["basic", "chain", "word"], chainLength: 3, questionsPerRound: 9, timerSec: 10 },
  ],
  4: [
    { themeId: "large_numbers", digitCount: 4, operations: ["add", "sub", "mul", "div"], maxNumber: 9999, allowCarry: true, modes: ["basic", "chain"], chainLength: 3, questionsPerRound: 8, timerSec: 11 },
    { themeId: "fractions_simple", digitCount: 3, operations: ["add", "sub", "mul", "div"], maxNumber: 1000, allowCarry: true, modes: ["basic", "fraction", "chain"], chainLength: 3, questionsPerRound: 9, timerSec: 10 },
    { themeId: "percent_intro", digitCount: 3, operations: ["add", "sub", "mul", "div"], maxNumber: 1000, allowCarry: true, modes: ["basic", "fraction", "percent"], chainLength: 0, questionsPerRound: 9, timerSec: 10 },
    { themeId: "mixed_chains", digitCount: 4, operations: ["add", "sub", "mul", "div"], maxNumber: 5000, allowCarry: true, modes: ["basic", "chain", "percent", "word"], chainLength: 4, questionsPerRound: 10, timerSec: 9 },
  ],
  5: [
    { themeId: "percent_intro", digitCount: 3, operations: ["add", "sub", "mul", "div"], maxNumber: 2000, allowCarry: true, modes: ["basic", "percent", "fraction"], chainLength: 0, questionsPerRound: 9, timerSec: 10 },
    { themeId: "mixed_chains", digitCount: 4, operations: ["add", "sub", "mul", "div"], maxNumber: 9999, allowCarry: true, modes: ["basic", "chain", "percent"], chainLength: 4, questionsPerRound: 10, timerSec: 9 },
    { themeId: "word_problems", digitCount: 4, operations: ["add", "sub", "mul", "div"], maxNumber: 9999, allowCarry: true, modes: ["basic", "chain", "fraction", "percent", "word"], chainLength: 4, questionsPerRound: 11, timerSec: 8 },
    { themeId: "word_problems", digitCount: 4, operations: ["add", "sub", "mul", "div"], maxNumber: 9999, allowCarry: true, modes: ["basic", "chain", "fraction", "percent", "word"], chainLength: 4, questionsPerRound: 12, timerSec: 7 },
  ],
}

export function getMathCurriculum(grade: SchoolGrade, level: number): MathCurriculum {
  const g = normalizeSchoolGrade(grade)
  const steps = MATH_BY_GRADE[g]
  const decade = getCurriculumDecade(level)
  const idx = Math.min(steps.length - 1, decade)
  return mathStep(steps[idx])
}

// ---------- Word ----------

export type WordThemeId =
  | "everyday"
  | "school"
  | "nature"
  | "body"
  | "home"
  | "animals"
  | "travel"
  | "science"
  | "compounds"

export interface WordCurriculum {
  themeId: WordThemeId
  themeLabelKey: WordThemeId
  wordLength: [number, number]
  gaps: number
  choiceCount: number
  wordsPerRound: number
  poolId: WordPoolId
  mixDifficulties: boolean
  modes: WordExerciseMode[]
  timedSec: number
  /** Kategorie-Filter für Wortlisten (lowercase tags) */
  categories: string[]
}

type WordStep = Omit<WordCurriculum, "themeLabelKey">

function wordStep(partial: WordStep): WordCurriculum {
  return { ...partial, themeLabelKey: partial.themeId }
}

const WORD_BY_GRADE: Record<SchoolGrade, WordStep[]> = {
  1: [
    { themeId: "everyday", wordLength: [3, 4], gaps: 1, choiceCount: 5, wordsPerRound: 10, poolId: "easy", mixDifficulties: false, modes: ["gaps"], timedSec: 0, categories: ["farben", "tiere", "essen"] },
    { themeId: "school", wordLength: [3, 5], gaps: 1, choiceCount: 5, wordsPerRound: 10, poolId: "easy", mixDifficulties: false, modes: ["gaps"], timedSec: 0, categories: ["schule", "farben"] },
    { themeId: "nature", wordLength: [4, 5], gaps: 1, choiceCount: 6, wordsPerRound: 11, poolId: "easy", mixDifficulties: false, modes: ["gaps"], timedSec: 0, categories: ["tiere", "essen"] },
    { themeId: "body", wordLength: [4, 5], gaps: 2, choiceCount: 6, wordsPerRound: 12, poolId: "easy", mixDifficulties: false, modes: ["gaps", "syllable"], timedSec: 0, categories: ["haushalt", "essen"] },
  ],
  2: [
    { themeId: "home", wordLength: [4, 6], gaps: 2, choiceCount: 6, wordsPerRound: 12, poolId: "medium", mixDifficulties: false, modes: ["gaps"], timedSec: 0, categories: ["haushalt", "essen"] },
    { themeId: "animals", wordLength: [4, 6], gaps: 2, choiceCount: 6, wordsPerRound: 12, poolId: "medium", mixDifficulties: false, modes: ["gaps", "anagram"], timedSec: 0, categories: ["tiere"] },
    { themeId: "school", wordLength: [5, 7], gaps: 2, choiceCount: 7, wordsPerRound: 13, poolId: "medium", mixDifficulties: false, modes: ["gaps", "syllable"], timedSec: 0, categories: ["schule"] },
    { themeId: "nature", wordLength: [5, 7], gaps: 3, choiceCount: 7, wordsPerRound: 14, poolId: "medium", mixDifficulties: true, modes: ["gaps", "anagram", "syllable"], timedSec: 0, categories: ["tiere", "essen"] },
  ],
  3: [
    { themeId: "travel", wordLength: [5, 8], gaps: 2, choiceCount: 7, wordsPerRound: 14, poolId: "hard", mixDifficulties: false, modes: ["gaps", "anagram"], timedSec: 0, categories: ["haushalt", "schule"] },
    { themeId: "science", wordLength: [6, 9], gaps: 3, choiceCount: 8, wordsPerRound: 14, poolId: "hard", mixDifficulties: false, modes: ["gaps", "syllable", "timed"], timedSec: 25, categories: ["mathe", "zahlen"] },
    { themeId: "compounds", wordLength: [7, 10], gaps: 3, choiceCount: 8, wordsPerRound: 15, poolId: "hard", mixDifficulties: true, modes: ["gaps", "anagram", "timed"], timedSec: 22, categories: ["schule", "haushalt"] },
  ],
  4: [
    { themeId: "science", wordLength: [6, 11], gaps: 3, choiceCount: 8, wordsPerRound: 15, poolId: "expert", mixDifficulties: false, modes: ["gaps", "anagram", "syllable"], timedSec: 0, categories: ["mathe", "zahlen"] },
    { themeId: "compounds", wordLength: [8, 12], gaps: 4, choiceCount: 9, wordsPerRound: 16, poolId: "expert", mixDifficulties: true, modes: ["gaps", "anagram", "timed"], timedSec: 20, categories: ["schule", "mathe"] },
    { themeId: "travel", wordLength: [7, 12], gaps: 4, choiceCount: 9, wordsPerRound: 16, poolId: "expert", mixDifficulties: true, modes: ["gaps", "syllable", "timed", "poolMix"], timedSec: 18, categories: ["haushalt", "schule", "tiere"] },
  ],
  5: [
    { themeId: "compounds", wordLength: [8, 14], gaps: 4, choiceCount: 10, wordsPerRound: 16, poolId: "mixed", mixDifficulties: true, modes: ["gaps", "anagram", "syllable", "timed"], timedSec: 18, categories: ["mathe", "schule"] },
    { themeId: "science", wordLength: [8, 14], gaps: 5, choiceCount: 10, wordsPerRound: 17, poolId: "mixed", mixDifficulties: true, modes: ["gaps", "anagram", "timed", "poolMix"], timedSec: 16, categories: ["mathe", "zahlen"] },
    { themeId: "compounds", wordLength: [8, 14], gaps: 5, choiceCount: 10, wordsPerRound: 18, poolId: "mixed", mixDifficulties: true, modes: ["gaps", "anagram", "syllable", "timed", "poolMix"], timedSec: 14, categories: ["schule", "mathe", "haushalt"] },
  ],
}

export function getWordCurriculum(grade: SchoolGrade, level: number): WordCurriculum {
  const g = normalizeSchoolGrade(grade)
  const steps = WORD_BY_GRADE[g]
  const decade = getCurriculumDecade(level)
  const idx = Math.min(steps.length - 1, decade)
  return wordStep(steps[idx])
}

// ---------- Memory ----------

export type MemoryThemeId =
  | "classic_shapes"
  | "animals_farm"
  | "food_fruit"
  | "space_stars"
  | "sports_ball"
  | "school_tools"
  | "nature_mix"
  | "challenge_mix"

export interface MemoryCurriculum {
  themeId: MemoryThemeId
  themeLabelKey: MemoryThemeId
  pairs: number
  peekMs: number
  mismatchDelayMs: number
  gridCols: number
  motifSet: MemoryMotifSet
  modes: MemoryExerciseMode[]
  sequenceLength: number
  oneRevealLockMs: number
}

type MemoryStep = Omit<MemoryCurriculum, "themeLabelKey">

function memoryStep(partial: MemoryStep): MemoryCurriculum {
  return { ...partial, themeLabelKey: partial.themeId }
}

const MEMORY_BY_GRADE: Record<SchoolGrade, MemoryStep[]> = {
  1: [
    { themeId: "classic_shapes", pairs: 4, peekMs: 1800, mismatchDelayMs: 650, gridCols: 4, motifSet: "classic", modes: ["pairs"], sequenceLength: 0, oneRevealLockMs: 0 },
    { themeId: "animals_farm", pairs: 4, peekMs: 1500, mismatchDelayMs: 600, gridCols: 4, motifSet: "animals", modes: ["pairs", "preview"], sequenceLength: 0, oneRevealLockMs: 0 },
    { themeId: "food_fruit", pairs: 5, peekMs: 1200, mismatchDelayMs: 580, gridCols: 5, motifSet: "food", modes: ["pairs", "preview"], sequenceLength: 0, oneRevealLockMs: 0 },
    { themeId: "school_tools", pairs: 6, peekMs: 1000, mismatchDelayMs: 550, gridCols: 3, motifSet: "classic", modes: ["pairs", "preview"], sequenceLength: 0, oneRevealLockMs: 0 },
  ],
  2: [
    { themeId: "animals_farm", pairs: 6, peekMs: 1000, mismatchDelayMs: 550, gridCols: 3, motifSet: "animals", modes: ["pairs", "preview"], sequenceLength: 0, oneRevealLockMs: 0 },
    { themeId: "sports_ball", pairs: 6, peekMs: 800, mismatchDelayMs: 520, gridCols: 3, motifSet: "sports", modes: ["pairs", "preview", "sequence"], sequenceLength: 3, oneRevealLockMs: 0 },
    { themeId: "space_stars", pairs: 7, peekMs: 600, mismatchDelayMs: 500, gridCols: 4, motifSet: "space", modes: ["pairs", "preview", "sequence"], sequenceLength: 3, oneRevealLockMs: 0 },
    { themeId: "nature_mix", pairs: 8, peekMs: 400, mismatchDelayMs: 480, gridCols: 4, motifSet: "mixed", modes: ["pairs", "preview", "sequence"], sequenceLength: 4, oneRevealLockMs: 0 },
  ],
  3: [
    { themeId: "space_stars", pairs: 8, peekMs: 400, mismatchDelayMs: 480, gridCols: 4, motifSet: "space", modes: ["pairs", "preview", "sequence"], sequenceLength: 4, oneRevealLockMs: 0 },
    { themeId: "nature_mix", pairs: 8, peekMs: 200, mismatchDelayMs: 450, gridCols: 4, motifSet: "mixed", modes: ["pairs", "sequence", "oneReveal"], sequenceLength: 4, oneRevealLockMs: 900 },
    { themeId: "challenge_mix", pairs: 9, peekMs: 0, mismatchDelayMs: 420, gridCols: 4, motifSet: "mixed", modes: ["pairs", "sequence", "oneReveal", "mixedSets"], sequenceLength: 5, oneRevealLockMs: 1000 },
  ],
  4: [
    { themeId: "challenge_mix", pairs: 9, peekMs: 0, mismatchDelayMs: 420, gridCols: 4, motifSet: "mixed", modes: ["pairs", "sequence", "oneReveal", "mixedSets"], sequenceLength: 5, oneRevealLockMs: 1000 },
    { themeId: "nature_mix", pairs: 10, peekMs: 0, mismatchDelayMs: 400, gridCols: 4, motifSet: "mixed", modes: ["pairs", "sequence", "oneReveal", "mixedSets"], sequenceLength: 6, oneRevealLockMs: 1100 },
    { themeId: "challenge_mix", pairs: 11, peekMs: 0, mismatchDelayMs: 380, gridCols: 4, motifSet: "mixed", modes: ["pairs", "sequence", "oneReveal", "mixedSets"], sequenceLength: 6, oneRevealLockMs: 1200 },
  ],
  5: [
    { themeId: "challenge_mix", pairs: 10, peekMs: 0, mismatchDelayMs: 380, gridCols: 4, motifSet: "mixed", modes: ["pairs", "sequence", "oneReveal", "mixedSets"], sequenceLength: 6, oneRevealLockMs: 1200 },
    { themeId: "challenge_mix", pairs: 11, peekMs: 0, mismatchDelayMs: 360, gridCols: 4, motifSet: "mixed", modes: ["pairs", "sequence", "oneReveal", "mixedSets"], sequenceLength: 7, oneRevealLockMs: 1300 },
    { themeId: "challenge_mix", pairs: 12, peekMs: 0, mismatchDelayMs: 350, gridCols: 4, motifSet: "mixed", modes: ["pairs", "sequence", "oneReveal", "mixedSets"], sequenceLength: 7, oneRevealLockMs: 1400 },
  ],
}

export function getMemoryCurriculum(grade: SchoolGrade, level: number): MemoryCurriculum {
  const g = normalizeSchoolGrade(grade)
  const steps = MEMORY_BY_GRADE[g]
  const decade = getCurriculumDecade(level)
  const idx = Math.min(steps.length - 1, decade)
  return memoryStep(steps[idx])
}
