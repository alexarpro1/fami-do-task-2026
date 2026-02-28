export type MathQuestDifficultyBand = "easy" | "medium" | "hard"

export type MathQuestOperation = "add" | "sub" | "mul" | "div"

export interface MathQuestQuestion {
  id: string
  level: number
  difficulty: MathQuestDifficultyBand
  operation: MathQuestOperation
  a: number
  b: number
  correctResult: number
  options: number[]
}

export interface WordBuilderEntry {
  id: string
  level: number
  /** Kategorie wie Tiere, Farben, Schule etc. */
  category: string
  /** Vollständiges Wort, z. B. "Maus". */
  word: string
  /** Muster mit Lücken, z. B. "_aus" oder "M__s". */
  pattern: string
  /** Erlaubte Buchstaben zur Auswahl (inkl. Ablenker). */
  letters: string[]
}

export interface MoleDashConfig {
  level: number
  /** Anzahl der Felder (z. B. 6, 9 oder 12). */
  gridSize: number
  /** Wie viele Ziele können gleichzeitig aktiv sein. */
  concurrentMoles: number
  /** Dauer in Millisekunden, wie lange ein Ziel sichtbar bleibt. */
  activeDurationMs: number
  /** Pausenzeit zwischen zwei Aktivierungen. */
  pauseDurationMs: number
  /** Wie viele Runden pro Spiel. */
  rounds: number
}

export const MATHQUEST_LEVELS: MathQuestDifficultyBand[] = [
  "easy", // Level 1–10: einfache Plus/Minus-Aufgaben
  "easy",
  "easy",
  "easy",
  "easy",
  "medium", // Level 11–20: zweistellige Zahlen, erste Multiplikation
  "medium",
  "medium",
  "medium",
  "medium",
  "hard", // Level 21–50: gemischte Aufgaben, leicht steigender Zeitdruck
] as const

export const WORD_BUILDER_CATEGORIES = ["tiere", "farben", "schule", "essen", "haushalt"] as const

export const MOLEDASH_LEVEL_CONFIG: MoleDashConfig[] = [
  { level: 1, gridSize: 6, concurrentMoles: 1, activeDurationMs: 1200, pauseDurationMs: 800, rounds: 5 },
  { level: 5, gridSize: 6, concurrentMoles: 1, activeDurationMs: 1000, pauseDurationMs: 700, rounds: 7 },
  { level: 10, gridSize: 9, concurrentMoles: 1, activeDurationMs: 900, pauseDurationMs: 650, rounds: 8 },
  { level: 15, gridSize: 9, concurrentMoles: 2, activeDurationMs: 800, pauseDurationMs: 600, rounds: 10 },
  { level: 20, gridSize: 9, concurrentMoles: 2, activeDurationMs: 750, pauseDurationMs: 550, rounds: 12 },
  { level: 30, gridSize: 12, concurrentMoles: 2, activeDurationMs: 700, pauseDurationMs: 500, rounds: 14 },
  { level: 40, gridSize: 12, concurrentMoles: 3, activeDurationMs: 650, pauseDurationMs: 450, rounds: 16 },
  { level: 50, gridSize: 12, concurrentMoles: 3, activeDurationMs: 600, pauseDurationMs: 400, rounds: 18 },
]
