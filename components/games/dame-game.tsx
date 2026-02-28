"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createInitialBoard,
  getMoves,
  getGameResult,
  applyMove,
  nextTurn,
  getAllMoves,
  getDameAIMove,
  getPiece,
  type Board,
  type Pos,
  type Color,
  type GameResult,
  type Move,
  type DameAIDifficulty,
} from "@/lib/checkers"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { RotateCcw, Users, Cpu, ChevronDown, ChevronUp, Trophy, BookOpen, Settings2, ZoomIn, ZoomOut } from "lucide-react"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"

const DAME_STORAGE_KEY = "fami-dame-progress"
const DAME_GAME_STORAGE_KEY = "fami-dame-game"
const DAME_PREFS_KEY = "fami-dame-prefs"

const XP_WIN = 100
const XP_DRAW = 50
const XP_PER_CAPTURE = 10
const XP_PER_KING = 20
const XP_PER_TASKCARD = 50
const XP_PER_LEVEL = 200

type ChallengeCtx = {
  moveCount: number
  result: GameResult
  humanWon: boolean
  opponentCapturedKing: boolean
  doubleCaptureWithKing: boolean
  totalHumanCaptures: number
  maxCapturesInOneMove: number
  firstKingAtMove: number | null
}

const GOLDEN_RULES = [
  "Bewegung: Normale Steine ziehen nur diagonal vorwärts.",
  "Schlagen: Überspringe einen Gegner auf ein freies Feld dahinter (Pflicht bei Möglichkeit).",
  "Die Dame: Zieht beliebig weit diagonal (vorwärts und rückwärts).",
  "Ziel: Alle gegnerischen Steine schlagen oder Gegner blockieren.",
]

const CHALLENGE_POOL: { id: string; label: string; check: (ctx: ChallengeCtx) => boolean }[] = [
  { id: "blitz", label: "Blitzsieg: Gewinne in unter 20 Zügen", check: (ctx) => ctx.humanWon && ctx.moveCount < 20 },
  { id: "mauer", label: "Mauer: Beende ohne dass der Gegner eine Dame schlägt", check: (ctx) => ctx.result !== null && !ctx.opponentCapturedKing },
  { id: "double", label: "Double-Trouble: Schlage 2 Steine mit einer Dame in einem Zug", check: (ctx) => ctx.doubleCaptureWithKing },
  { id: "abraumer", label: "Der Abräumer: Schlage 3 Steine in einem Zug", check: (ctx) => ctx.maxCapturesInOneMove >= 3 },
  { id: "pazifist", label: "Pazifist: Gewinne ohne mehr als 5 gegnerische Steine zu schlagen", check: (ctx) => ctx.humanWon && ctx.totalHumanCaptures <= 5 },
  { id: "fruehaufsteher", label: "Frühaufsteher: Erstelle eine Dame in den ersten 10 Zügen", check: (ctx) => ctx.firstKingAtMove !== null && ctx.firstKingAtMove <= 10 },
]

const POINTS_WIN = 25
const POINTS_DRAW = 10

const BOARD_SIZE_DEFAULT = 400
const BOARD_SIZE_MIN = 200
const BOARD_SIZE_MAX = 700

const GAME_MODES: { id: "pvp" | "ai"; name: string; icon: typeof Users }[] = [
  { id: "pvp", name: "Zwei Spieler (PvP)", icon: Users },
  { id: "ai", name: "Gegen KI", icon: Cpu },
]

const AI_DIFFICULTIES: { id: DameAIDifficulty; name: string }[] = [
  { id: "easy", name: "KI: Leicht" },
  { id: "medium", name: "KI: Mittel" },
  { id: "hard", name: "KI: Schwer" },
]

const FILE_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h"]
const RANK_LABELS = ["8", "7", "6", "5", "4", "3", "2", "1"]

/** Brett-Notation wie Schach: a1 (unten links) bis h8 (oben rechts). */
function posToNotation(pos: Pos): string {
  return `${FILE_LABELS[pos.c]}${8 - pos.r}`
}

/** Vollständiger Zugpfad: Start → alle Landefelder → Ziel (nur dunkle Felder, Reihenfolge wie gespielt). */
function getMovePath(move: Move): Pos[] {
  const path: Pos[] = [{ ...move.from }]
  let cur = { ...move.from }
  for (const cap of move.captures) {
    cur = { r: 2 * cap.r - cur.r, c: 2 * cap.c - cur.c }
    path.push({ ...cur })
  }
  if (path.length === 0 || path[path.length - 1].r !== move.to.r || path[path.length - 1].c !== move.to.c) {
    path.push({ ...move.to })
  }
  return path
}

/** Zug als Notation-String (z. B. "a3 → c5 → e7" bei Mehrfachzug). */
function formatMoveNotation(move: Move): string {
  return getMovePath(move).map(posToNotation).join(" → ")
}

/** Richtungsbeschreibung für einen Zug (diagonal). */
function getDirectionLabel(from: Pos, to: Pos): string {
  const dr = to.r - from.r
  const dc = to.c - from.c
  if (dr < 0 && dc < 0) return "oben links"
  if (dr < 0 && dc > 0) return "oben rechts"
  if (dr > 0 && dc < 0) return "unten links"
  if (dr > 0 && dc > 0) return "unten rechts"
  return ""
}

const DAME_DESIGNS: Array<{
  id: string
  name: string
  levelRequired?: number
  boardLight: string
  boardDark: string
  pieceWhite: string
  pieceBlack: string
  pieceWhiteKing: string
  pieceBlackKing: string
}> = [
  {
    id: "classic",
    name: "Klassisch",
    levelRequired: 1,
    boardLight: "bg-amber-100 dark:bg-amber-900/60",
    boardDark: "bg-amber-800 dark:bg-amber-950",
    pieceWhite: "bg-white border-2 border-amber-900/30 shadow-md",
    pieceBlack: "bg-neutral-900 border-2 border-amber-950/70 shadow-md ring-2 ring-white/35",
    pieceWhiteKing: "bg-white border-2 border-amber-600 ring-2 ring-amber-500/50",
    pieceBlackKing: "bg-neutral-900 border-2 border-amber-400/40 ring-2 ring-amber-300/70 shadow-[0_0_8px_rgba(255,255,255,0.35)]",
  },
  {
    id: "modern",
    name: "Modern",
    levelRequired: 6,
    boardLight: "bg-white dark:bg-zinc-100",
    boardDark: "bg-neutral-800 dark:bg-zinc-900",
    pieceWhite: "bg-white border-2 border-neutral-300 shadow-md",
    pieceBlack: "bg-neutral-900 border-2 border-neutral-500 shadow-md ring-2 ring-white/35",
    pieceWhiteKing: "bg-white ring-2 ring-amber-500 shadow-lg shadow-amber-500/40",
    pieceBlackKing: "bg-neutral-900 ring-2 ring-amber-300 shadow-lg shadow-amber-300/40",
  },
  {
    id: "green",
    name: "Grün",
    levelRequired: 1,
    boardLight: "bg-green-100 dark:bg-green-900/50",
    boardDark: "bg-green-800 dark:bg-green-950",
    pieceWhite: "bg-white border-2 border-green-800/40 shadow-md",
    pieceBlack: "bg-neutral-900 border-2 border-green-900 shadow-md ring-2 ring-white/35",
    pieceWhiteKing: "bg-white ring-2 ring-green-500",
    pieceBlackKing: "bg-neutral-900 ring-2 ring-green-300/70 shadow-[0_0_8px_rgba(190,242,100,0.5)]",
  },
  {
    id: "blue",
    name: "Blau",
    levelRequired: 1,
    boardLight: "bg-sky-100 dark:bg-sky-900/50",
    boardDark: "bg-sky-700 dark:bg-sky-950",
    pieceWhite: "bg-white border-2 border-sky-800/40 shadow-md",
    pieceBlack: "bg-neutral-900 border-2 border-sky-900 shadow-md ring-2 ring-white/35",
    pieceWhiteKing: "bg-white ring-2 ring-sky-500",
    pieceBlackKing: "bg-neutral-900 ring-2 ring-sky-300/70 shadow-[0_0_8px_rgba(125,211,252,0.5)]",
  },
  {
    id: "dark",
    name: "Dunkel",
    levelRequired: 1,
    boardLight: "bg-zinc-500 dark:bg-zinc-600",
    boardDark: "bg-zinc-800 dark:bg-zinc-900",
    pieceWhite: "bg-white border border-zinc-400 shadow-md",
    pieceBlack: "bg-zinc-900 border border-zinc-500 shadow-md ring-2 ring-white/35",
    pieceWhiteKing: "bg-white ring-2 ring-zinc-300 shadow-[0_0_8px_rgba(250,250,250,0.6)]",
    pieceBlackKing: "bg-zinc-900 ring-2 ring-zinc-300 shadow-[0_0_8px_rgba(250,250,250,0.5)]",
  },
  {
    id: "oak",
    name: "Eichenholz",
    levelRequired: 1,
    boardLight: "bg-amber-200/90 dark:bg-amber-800/40",
    boardDark: "bg-amber-900/95 dark:bg-amber-950",
    pieceWhite: "bg-amber-50 border-2 border-amber-800/50 shadow-lg shadow-amber-900/20",
    pieceBlack: "bg-stone-900 border-2 border-amber-700/70 shadow-lg shadow-black/40 ring-2 ring-white/35",
    pieceWhiteKing: "bg-amber-50 ring-2 ring-amber-500 shadow-lg shadow-amber-600/30",
    pieceBlackKing: "bg-stone-900 ring-2 ring-amber-300/80 shadow-lg shadow-amber-300/40",
  },
  {
    id: "neon",
    name: "Neon",
    levelRequired: 6,
    boardLight: "bg-black",
    boardDark: "bg-neutral-950 border border-cyan-500/40 shadow-[inset_0_0_12px_rgba(34,211,238,0.15)]",
    pieceWhite: "bg-white/95 shadow-[0_0_12px_rgba(255,255,255,0.6)] border border-cyan-300/50",
    pieceBlack: "bg-neutral-700 shadow-[0_0_12px_rgba(236,72,153,0.4)] border border-pink-400/50",
    pieceWhiteKing: "bg-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.8)] border border-amber-400 text-amber-900",
    pieceBlackKing: "bg-amber-600 shadow-[0_0_16px_rgba(251,191,36,0.6)] border border-amber-400 text-amber-950",
  },
]

type DesignId = string

/** Gespeicherter Spielstand Dame – wird bei Verlassen/App-Schließen persistiert. */
interface DameSaveState {
  board: Board
  turn: Color
  result: GameResult
  gameMode: "pvp" | "ai"
  aiDifficulty?: DameAIDifficulty
  designId: string
  boardSize: number
  showCoordinates: boolean
  lastMove: Move | null
  moveHistory: Array<{ move: Move; color: Color }>
}

function loadDameGameSave(): DameSaveState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(DAME_GAME_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as DameSaveState
    if (!data || !Array.isArray(data.board) || data.board.length !== 8) return null
    return data
  } catch {
    return null
  }
}

function saveDameGameSave(state: DameSaveState): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(DAME_GAME_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

/** Brett-Design und Anzeige – getrennt gespeichert, bleibt auch nach mehreren Neustarts erhalten. */
type DamePrefs = Pick<DameSaveState, "designId" | "boardSize" | "showCoordinates">

function loadDamePrefs(): DamePrefs | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(DAME_PREFS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DamePrefs
  } catch {
    return null
  }
}

function saveDamePrefs(prefs: DamePrefs): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(DAME_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

interface DameGameProps {
  onAwardPoints: (points: number, message: string, reason?: string) => void
  onClose: () => void
}

export function DameGame({ onAwardPoints, onClose }: DameGameProps) {
  const [board, setBoard] = useState<Board>(() => createInitialBoard())
  const [turn, setTurn] = useState<Color>("w")
  const [selected, setSelected] = useState<Pos | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([])
  const [result, setResult] = useState<GameResult>(null)
  const [hasAwarded, setHasAwarded] = useState(false)
  const [designId, setDesignId] = useState<DesignId>("classic")
  const [boardSize, setBoardSize] = useState(BOARD_SIZE_DEFAULT)
  const [showCoordinates, setShowCoordinates] = useState(true)
  const [showNewGameChoice, setShowNewGameChoice] = useState(false)
  const [animatingMove, setAnimatingMove] = useState<{ path: Pos[]; step: number; color: Color } | null>(null)
  const [animationPhase, setAnimationPhase] = useState<"start" | "end">("start")
  const [gameMode, setGameMode] = useState<"pvp" | "ai">("pvp")
  const [aiDifficulty, setAiDifficulty] = useState<DameAIDifficulty>("easy")
  const [isComputerThinking, setIsComputerThinking] = useState(false)
  const [moveCount, setMoveCount] = useState(0)
  const computerTurnRef = useRef(false)
  const [opponentCapturedKing, setOpponentCapturedKing] = useState(false)
  const [doubleCaptureWithKing, setDoubleCaptureWithKing] = useState(false)
  const [challenges, setChallenges] = useState<typeof CHALLENGE_POOL>(() => [...CHALLENGE_POOL].sort(() => Math.random() - 0.5).slice(0, 3))
  const [showRules, setShowRules] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [lastMove, setLastMove] = useState<Move | null>(null)
  const [moveHistory, setMoveHistory] = useState<Array<{ move: Move; color: Color }>>([])
  const [dameLevel, setDameLevel] = useState(1)
  const [dameXp, setDameXp] = useState(0)
  const [totalCapturedLifetime, setTotalCapturedLifetime] = useState(0)
  const [xpAwarded, setXpAwarded] = useState(false)
  const [humanCapturesThisGame, setHumanCapturesThisGame] = useState(0)
  const [humanKingsCreatedThisGame, setHumanKingsCreatedThisGame] = useState(0)
  const [maxCapturesInOneMove, setMaxCapturesInOneMove] = useState(0)
  const [firstKingAtMove, setFirstKingAtMove] = useState<number | null>(null)
  type DameUndoState = { board: Board; turn: Color; lastMove: Move | null; moveHistory: Array<{ move: Move; color: Color }>; moveCount: number }
  const [undoStack, setUndoStack] = useState<DameUndoState[]>([])
  const prevTurnRef = useRef<Color | null>(null)
  const skipNextPushRef = useRef(false)
  const dameBonusClaimedRef = useRef<number[]>([])

  const { xpInCurrentLevel, xpForNextLevel, nextLevel } = getLevelProgress(dameXp, XP_PER_LEVEL)
  const nextBonusLevel = getNextBonusLevel("dame", dameLevel)

  useEffect(() => {
    if (!animatingMove) return
    const raf = requestAnimationFrame(() => setAnimationPhase("end"))
    const isMultiStep = animatingMove.path.length > 2
    const duration = isMultiStep ? 450 : 320
    const currentStep = animatingMove.step
    const maxStep = animatingMove.path.length - 2
    const t = setTimeout(() => {
      if (currentStep < maxStep) {
        setAnimatingMove((prev) => (prev ? { ...prev, step: currentStep + 1 } : prev))
        setAnimationPhase("start")
      } else {
        setAnimatingMove(null)
        setAnimationPhase("start")
      }
    }, duration)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [animatingMove])

  // Wenn während eines laufenden Spiels von PvP auf KI umgeschaltet wird und Schwarz am Zug ist,
  // soll die KI den nächsten Zug übernehmen. Dafür das Flag für den KI-Zug setzen.
  useEffect(() => {
    if (result) return
    if (gameMode === "ai" && turn === "b") {
      computerTurnRef.current = true
    }
    if (gameMode !== "ai") {
      computerTurnRef.current = false
    }
  }, [gameMode, turn, result])

  useEffect(() => {
    if (result || gameMode !== "ai") {
      prevTurnRef.current = turn
      return
    }
    if (turn === "b") {
      prevTurnRef.current = "b"
      return
    }
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false
      prevTurnRef.current = "w"
      return
    }
    if (prevTurnRef.current !== "b" && prevTurnRef.current !== null && moveCount > 0) {
      prevTurnRef.current = "w"
      return
    }
    const state: DameUndoState = {
      board: board.map((row) => row.map((s) => (s ? { ...s } : null))),
      turn: "w",
      lastMove: lastMove ? { ...lastMove, from: { ...lastMove.from }, to: { ...lastMove.to }, captures: lastMove.captures.map((p) => ({ ...p })) } : null,
      moveHistory: moveHistory.map((e) => ({ move: { ...e.move, from: { ...e.move.from }, to: { ...e.move.to }, captures: e.move.captures.map((p) => ({ ...p })) }, color: e.color })),
      moveCount,
    }
    setUndoStack((s) => (s.length > 20 ? [...s.slice(-19), state] : [...s, state]))
    prevTurnRef.current = "w"
  }, [turn, board, moveCount, lastMove, moveHistory, result, gameMode])

  const handleUndo = useCallback(() => {
    if (gameMode !== "ai" || undoStack.length < 2 || result) return
    skipNextPushRef.current = true
    const prev = undoStack[undoStack.length - 2]
    setBoard(prev.board)
    setTurn(prev.turn)
    setLastMove(prev.lastMove)
    setMoveHistory(prev.moveHistory)
    setMoveCount(prev.moveCount)
    setResult(null)
    setSelected(null)
    setPossibleMoves([])
    setAnimatingMove(null)
    setUndoStack((s) => s.slice(0, -2))
  }, [gameMode, undoStack, result])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DAME_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const { level = 1, xp = 0, totalCaptured = 0, bonusClaimedLevels } = parsed
        setDameLevel(typeof level === "number" && level > 0 ? level : 1)
        setDameXp(typeof xp === "number" && xp >= 0 ? xp : 0)
        setTotalCapturedLifetime(typeof totalCaptured === "number" && totalCaptured >= 0 ? totalCaptured : 0)
        if (Array.isArray(bonusClaimedLevels)) {
          dameBonusClaimedRef.current = bonusClaimedLevels.filter((n: unknown) => typeof n === "number" && Number.isFinite(n))
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Gespeicherten Spielstand laden (nur einmal beim Mount)
  const [hasLoadedGameSave, setHasLoadedGameSave] = useState(false)
  useEffect(() => {
    if (hasLoadedGameSave) return
    setHasLoadedGameSave(true)
    const saved = loadDameGameSave()
    if (saved) {
      setBoard(saved.board)
      setTurn(saved.turn)
      setResult(saved.result)
      setGameMode(saved.gameMode)
      if (saved.aiDifficulty) setAiDifficulty(saved.aiDifficulty)
      if (saved.designId) setDesignId(saved.designId)
      if (saved.boardSize != null) setBoardSize(saved.boardSize)
      if (saved.showCoordinates != null) setShowCoordinates(saved.showCoordinates)
      setLastMove(saved.lastMove ?? null)
      const history = saved.moveHistory ?? []
      setMoveHistory(history)
      setMoveCount(history.length)
    } else {
      // Kein Spielstand: Brett-Design/Anzeige aus zuletzt gespeicherten Prefs laden
      const prefs = loadDamePrefs()
      if (prefs) {
        if (prefs.designId) setDesignId(prefs.designId)
        if (prefs.boardSize != null) setBoardSize(prefs.boardSize)
        if (prefs.showCoordinates != null) setShowCoordinates(prefs.showCoordinates)
      }
    }
  }, [hasLoadedGameSave])

  // Spielstand speichern bei Änderung und beim Verlassen (App schließen / Tab wechseln)
  const dameSaveRef = useRef<DameSaveState | null>(null)
  useEffect(() => {
    const state: DameSaveState = {
      board,
      turn,
      result,
      gameMode,
      aiDifficulty,
      designId,
      boardSize,
      showCoordinates,
      lastMove,
      moveHistory,
    }
    dameSaveRef.current = state
    saveDameGameSave(state)
    saveDamePrefs({ designId, boardSize, showCoordinates })
  }, [board, turn, result, gameMode, aiDifficulty, designId, boardSize, showCoordinates, lastMove, moveHistory])

  useEffect(() => {
    const flush = () => {
      if (dameSaveRef.current) saveDameGameSave(dameSaveRef.current)
    }
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") flush() }
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!result || xpAwarded) return
    setXpAwarded(true)
    const win = result === "b" || (result === "w" && gameMode === "pvp")
    const baseXp = result === "draw" ? XP_DRAW : win ? XP_WIN : 0
    const captureXp = humanCapturesThisGame * XP_PER_CAPTURE
    const kingXp = humanKingsCreatedThisGame * XP_PER_KING
    const completedTasks = challenges.filter((ch) =>
      ch.check({
        moveCount,
        result,
        humanWon: win,
        opponentCapturedKing,
        doubleCaptureWithKing,
        totalHumanCaptures: humanCapturesThisGame,
        maxCapturesInOneMove,
        firstKingAtMove,
      }),
    ).length
    const taskXp = completedTasks * XP_PER_TASKCARD
    const addXp = baseXp + captureXp + kingXp + taskXp
    if (addXp <= 0 && !win) return
    const {
      xp: nextXp,
      level: newLevel,
      bonusClaimedLevels,
      bonusCoins,
      newBonusLevels,
    } = applyXpAndGetBonuses("dame", { xp: dameXp, level: dameLevel, bonusClaimedLevels: dameBonusClaimedRef.current }, addXp, XP_PER_LEVEL)
    dameBonusClaimedRef.current = bonusClaimedLevels
    setDameXp(nextXp)
    setDameLevel(newLevel)
    const newTotal = totalCapturedLifetime + humanCapturesThisGame
    setTotalCapturedLifetime(newTotal)
    try {
      localStorage.setItem(DAME_STORAGE_KEY, JSON.stringify({ level: newLevel, xp: nextXp, totalCaptured: newTotal, bonusClaimedLevels }))
    } catch {
      // ignore
    }
    if (bonusCoins > 0 && newBonusLevels.length > 0) {
      const reachedText = newBonusLevels.length === 1 ? `Level ${newBonusLevels[0]}` : `Level ${newBonusLevels.join(", ")}`
      onAwardPoints(bonusCoins, `Bonus: ${reachedText} erreicht! +${bonusCoins} Goldmünzen`, "Dame: Level-Bonus")
    }
  }, [result, gameMode, xpAwarded, dameXp, humanCapturesThisGame, humanKingsCreatedThisGame, challenges, moveCount, opponentCapturedKing, doubleCaptureWithKing, maxCapturesInOneMove, firstKingAtMove, totalCapturedLifetime])

  const humanColor: Color = "w"
  const isHumanTurn = result === null && (gameMode === "pvp" || turn === humanColor) && !isComputerThinking

  const checkResult = useCallback(() => {
    const res = getGameResult(board, turn)
    setResult(res)
    if (res && !hasAwarded) {
      setHasAwarded(true)
      if (res === "w") {
        if (gameMode === "ai") onAwardPoints(POINTS_WIN, "Weiß gewinnt! Du hast gewonnen! 🏆", "Dame: Sieg")
        else if (gameMode === "pvp") onAwardPoints(POINTS_WIN, "Weiß gewinnt! Du hast gewonnen! 🏆", "Dame: Sieg")
      } else if (res === "b") {
        if (gameMode === "pvp") onAwardPoints(POINTS_WIN, "Schwarz gewinnt! Du hast gewonnen! 🏆", "Dame: Sieg")
      } else if (res === "draw") {
        onAwardPoints(POINTS_DRAW, "Unentschieden! 🤝", "Dame: Unentschieden")
      }
    }
  }, [board, turn, hasAwarded, gameMode, onAwardPoints])

  useEffect(() => {
    checkResult()
  }, [checkResult])

  useEffect(() => {
    if (result || gameMode !== "ai" || turn !== "b" || !computerTurnRef.current) return
    computerTurnRef.current = false
    setIsComputerThinking(true)
    const t = setTimeout(() => {
      const aiMove = getDameAIMove(board, "b", aiDifficulty)
      if (!aiMove) {
        setIsComputerThinking(false)
        return
      }
      const capturedKing = aiMove.captures.some((cap) => {
        const p = getPiece(board, cap)
        return p?.king && p.color === "w"
      })
      if (capturedKing) setOpponentCapturedKing(true)
      const { board: nextBoard } = applyMove(board, aiMove, "b")
      setBoard(nextBoard)
      setTurn("w")
      setLastMove(aiMove)
      setAnimatingMove({ path: getMovePath(aiMove), step: 0, color: "b" })
      setAnimationPhase("start")
      setMoveHistory((h) => [...h.slice(-9), { move: aiMove, color: "b" }])
      setMoveCount((n) => n + 1)
      setIsComputerThinking(false)
    }, 400 + (aiDifficulty === "hard" ? 300 : aiDifficulty === "medium" ? 150 : 0))
    return () => clearTimeout(t)
  }, [result, gameMode, turn, board, aiDifficulty])

  const handleSquareClick = (pos: Pos) => {
    if (result || !isHumanTurn) return
    const piece = board[pos.r][pos.c]
    const r = pos.r
    const c = pos.c

    if (selected) {
      const move = possibleMoves.find((m) => m.to.r === r && m.to.c === c)
      if (move) {
        const { board: nextBoard } = applyMove(board, move, turn)
        const pieceAtFrom = getPiece(board, move.from)
        if (pieceAtFrom?.king && move.captures.length >= 2) setDoubleCaptureWithKing(true)
        if (turn === "w") {
          setHumanCapturesThisGame((n) => n + move.captures.length)
          setMaxCapturesInOneMove((m) => Math.max(m, move.captures.length))
          const promoted = !pieceAtFrom?.king && (move.to.r === 7 || move.to.r === 0)
          if (promoted) {
            setHumanKingsCreatedThisGame((k) => k + 1)
            if (firstKingAtMove === null && moveCount + 1 <= 10) setFirstKingAtMove(moveCount + 1)
          }
        }
        setBoard(nextBoard)
        setTurn(nextTurn(turn))
        setSelected(null)
        setPossibleMoves([])
        setLastMove(move)
        setAnimatingMove({ path: getMovePath(move), step: 0, color: turn })
        setAnimationPhase("start")
        setMoveHistory((h) => [...h.slice(-9), { move, color: turn }])
        setMoveCount((n) => n + 1)
        if (gameMode === "ai" && nextTurn(turn) === "b") computerTurnRef.current = true
        return
      }
      if (piece?.color === turn) {
        setSelected(pos)
        setPossibleMoves(getMoves(board, pos, turn))
        return
      }
      setSelected(null)
      setPossibleMoves([])
      return
    }

    if (piece?.color === turn) {
      setSelected(pos)
      setPossibleMoves(getMoves(board, pos, turn))
    }
  }

  const startNewGame = (mode?: "pvp" | "ai") => {
    setShowNewGameChoice(false)
    setBoard(createInitialBoard())
    setTurn("w")
    setSelected(null)
    setPossibleMoves([])
    setLastMove(null)
    setAnimatingMove(null)
    setMoveHistory([])
    setResult(null)
    setHasAwarded(false)
    setMoveCount(0)
    setOpponentCapturedKing(false)
    setDoubleCaptureWithKing(false)
    setXpAwarded(false)
    setHumanCapturesThisGame(0)
    setHumanKingsCreatedThisGame(0)
    setMaxCapturesInOneMove(0)
    setFirstKingAtMove(null)
    const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5)
    setChallenges(shuffled.slice(0, 3))
    if (mode !== undefined) setGameMode(mode)
    setUndoStack([])
    prevTurnRef.current = null
    computerTurnRef.current = false
  }

  const resetGame = () => {
    setShowNewGameChoice(true)
  }

  const isDark = (r: number, c: number) => (r + c) % 2 === 1
  const isSelected = (r: number, c: number) => selected?.r === r && selected?.c === c
  const isPossible = (r: number, c: number) => possibleMoves.some((m) => m.to.r === r && m.to.c === c)
  /** Felder mit Figuren, die mit einem aktuell möglichen Zug geschlagen würden („zum Schlagen“). */
  const isCaptureTarget = (r: number, c: number) =>
    possibleMoves.some((m) => m.captures.some((p) => p.r === r && p.c === c))

  const humanWon = result === "w"
  const challengeCtx: ChallengeCtx = {
    moveCount,
    result,
    humanWon,
    opponentCapturedKing,
    doubleCaptureWithKing,
    totalHumanCaptures: humanCapturesThisGame,
    maxCapturesInOneMove,
    firstKingAtMove,
  }
  const challengeResults = challenges.map((ch) => ({ ...ch, done: result !== null && ch.check(challengeCtx) }))
  const unlockedDesigns = DAME_DESIGNS.filter((d) => dameLevel >= (d.levelRequired ?? 1))
  const effectiveDesignId = unlockedDesigns.some((d) => d.id === designId) ? designId : (unlockedDesigns[0]?.id ?? "classic")
  const design = DAME_DESIGNS.find((d) => d.id === effectiveDesignId) ?? DAME_DESIGNS[0]

  if (result && !showNewGameChoice) {
    const completed = challengeResults.filter((ch) => ch.done).length
    return (
      <div className="space-y-6 text-center py-8">
        <p className="text-2xl font-bold text-foreground">
          {result === "w" && "Weiß gewinnt!"}
          {result === "b" && "Schwarz gewinnt!"}
          {result === "draw" && "Unentschieden"}
        </p>
        <p className="text-muted-foreground">
          {(result === "b" || (result === "w" && gameMode === "pvp")) && `+${POINTS_WIN} Goldmünzen für dich!`}
          {result === "w" && gameMode === "ai" && "Die KI hat gewonnen."}
          {result === "draw" && `+${POINTS_DRAW} Goldmünzen`}
        </p>
        {challengeResults.length > 0 && (
          <div className="text-left max-w-sm mx-auto rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-medium text-foreground mb-2">Herausforderungen: {completed}/{challengeResults.length}</p>
            <ul className="space-y-1 text-xs">
              {challengeResults.map((ch) => (
                <li key={ch.id} className={ch.done ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                  {ch.done ? "✓" : "○"} {ch.label}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <Button variant="outline" onClick={resetGame}>
            Nochmal spielen
          </Button>
          <Button onClick={onClose}>Zurück zu den Spielen</Button>
        </div>
      </div>
    )
  }

  const cellSize = boardSize / 8

  return (
    <div className="space-y-4 relative">
      {showNewGameChoice && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-background/90 backdrop-blur-sm rounded-xl pb-6 sm:pb-0">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xl max-w-sm w-full mx-4 space-y-4">
            <p className="text-lg font-semibold text-foreground text-center">Neues Spiel</p>
            <p className="text-sm text-muted-foreground text-center">Modus wählen</p>
            <div className="grid gap-2">
              {GAME_MODES.map((mode) => (
                <Button
                  key={mode.id}
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => startNewGame(mode.id)}
                >
                  <mode.icon className="h-4 w-4" />
                  {mode.name}
                </Button>
              ))}
            </div>
            {gameMode === "ai" && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Schwierigkeit</p>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as DameAIDifficulty)}
                  className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2"
                >
                  {AI_DIFFICULTIES.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setShowNewGameChoice(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
            <Trophy className="h-3.5 w-3.5" />
            Level {dameLevel}
            {dameLevel <= 5 && " (Lehrling)"}
            {dameLevel >= 6 && dameLevel <= 15 && " (Geselle)"}
            {dameLevel >= 16 && dameLevel <= 30 && " (Meister)"}
            {dameLevel > 30 && " (Endlos)"}
          </span>
          {dameLevel > 30 && (
            <span className="text-xs text-muted-foreground">
              Highscore: <strong>{totalCapturedLifetime}</strong> Steine geschlagen
            </span>
          )}
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <p>
              {gameMode === "ai"
                ? "Du = Weiß. Sieg = +" + POINTS_WIN + " Goldmünzen"
                : "Sieg = +" + POINTS_WIN + ", Unentschieden = +" + POINTS_DRAW + " Goldmünzen"}
            </p>
            <p>
              XP {xpInCurrentLevel}/{xpForNextLevel || 0}
              {nextLevel ? ` bis Level ${nextLevel}` : " · Max-Level erreicht"}
              {nextBonusLevel && nextBonusLevel > dameLevel && ` · Nächster Bonus bei Level ${nextBonusLevel}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showSettings ? "secondary" : "outline"}
            size="sm"
            className="h-11 min-w-[44px] gap-2 px-3 text-sm font-medium"
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Einstellungen"
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            Einstellungen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-11 min-w-[44px] gap-2 px-3 text-sm font-medium"
            onClick={resetGame}
            aria-label="Neu starten"
          >
            <RotateCcw className="h-4 w-4 shrink-0" />
            Neu starten
          </Button>
        </div>
      </div>

      {/* Golden Rules + Herausforderungen nebeneinander (ab md) */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Golden Rules (aufklappbar) */}
        <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRules(!showRules)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Die goldenen Regeln
            </span>
            {showRules ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showRules && (
            <ul className="px-3 pb-3 pt-0 text-xs text-muted-foreground space-y-1 list-disc list-inside">
              {GOLDEN_RULES.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          )}
        </div>

        {/* TaskCards (Herausforderungen) */}
        {challenges.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-medium text-foreground mb-2">Herausforderungen</p>
            <ul className="space-y-1.5">
              {challengeResults.map((ch) => (
                <li
                  key={ch.id}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    ch.done ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                  )}
                >
                  {ch.done ? <span className="text-green-500">✓</span> : <span className="w-4">○</span>}
                  {ch.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Einstellungen (unter Regeln und Herausforderungen) */}
      {showSettings && (
        <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-4">
          <p className="text-sm font-medium text-foreground">Einstellungen</p>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Spielmodus</label>
            <Select value={gameMode} onValueChange={(v) => setGameMode(v as "pvp" | "ai")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAME_MODES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <m.icon className="h-4 w-4" />
                      {m.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {gameMode === "ai" && (
              <div className="mt-3">
                <label className="text-xs text-muted-foreground block mb-1">KI-Schwierigkeit</label>
                <Select value={aiDifficulty} onValueChange={(v) => setAiDifficulty(v as DameAIDifficulty)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_DIFFICULTIES.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {aiDifficulty === "hard" && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Schwer nutzt Taktik: 2-für-1-Falle, Gabel, Einmauern, Weg zur Dame.
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Gegen KI: Du spielst Weiß (ziehst zuerst).</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Brett-Design</label>
            <Select value={effectiveDesignId} onValueChange={(v) => setDesignId(v as DesignId)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unlockedDesigns.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}{d.levelRequired && d.levelRequired > 1 ? ` (ab Lv.${d.levelRequired})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs text-muted-foreground">Brettgröße</label>
              <span className="text-xs text-foreground tabular-nums">{boardSize} px</span>
            </div>
            <div className="flex items-center gap-2">
              <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
              <Slider
                value={[boardSize]}
                onValueChange={([v]) => setBoardSize(Math.max(BOARD_SIZE_MIN, Math.min(BOARD_SIZE_MAX, v)))}
                min={BOARD_SIZE_MIN}
                max={BOARD_SIZE_MAX}
                step={40}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="dame-show-coords"
              checked={showCoordinates}
              onCheckedChange={(v) => setShowCoordinates(v === true)}
            />
            <label htmlFor="dame-show-coords" className="text-xs text-muted-foreground cursor-pointer">
              Feldnotation (a1–h8) wie Schach anzeigen
            </label>
          </div>
        </div>
      )}

      {/* Letzter Zug oben, Zug-Anzeige unten, aufklappbare Zugliste */}
      <div className="space-y-2 flex flex-col items-center">
        {lastMove && (
          <div
            className="rounded-lg px-3 py-2 border border-border bg-muted/30 text-center shrink-0"
            style={{ width: boardSize }}
          >
            <p className="text-xs font-medium text-foreground">
              Letzter Zug: {formatMoveNotation(lastMove)}
              {lastMove.captures.length === 0 && (
                <span className="text-muted-foreground ml-1">({getDirectionLabel(lastMove.from, lastMove.to)})</span>
              )}
              {lastMove.captures.length > 0 && (
                <span className="text-destructive/90 ml-1">· {lastMove.captures.length} geschlagen</span>
              )}
            </p>
          </div>
        )}
        <div
          className={cn(
            "rounded-lg px-3 py-2 flex items-center justify-center gap-2 border shrink-0",
            isComputerThinking && "bg-muted/80 text-muted-foreground border-border",
            !isComputerThinking && turn === "b" && "bg-neutral-800 dark:bg-zinc-800 text-white border-amber-600/50 ring-1 ring-primary/20",
            !isComputerThinking && turn === "w" && "bg-white dark:bg-zinc-200 text-neutral-900 border-amber-400/50 ring-1 ring-primary/20",
          )}
          style={{ width: boardSize }}
        >
          {isComputerThinking ? (
            <span className="text-xs font-medium">Computer denkt nach…</span>
          ) : (
            <>
              <span
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full shrink-0 border-2 shadow-inner",
                  turn === "b"
                    ? "bg-neutral-800 border-neutral-700 dark:bg-zinc-700 dark:border-zinc-600"
                    : "bg-white border-neutral-300 dark:bg-zinc-200 dark:border-zinc-400",
                )}
                aria-hidden
              />
              <span className="text-xs font-medium">
                {turn === "b" ? "Schwarz" : "Weiß"} am Zug
                <span className="text-muted-foreground/80 mx-1">·</span>
                {turn === "w" ? "Du bist dran" : gameMode === "ai" ? "KI" : "Du bist dran"}
              </span>
            </>
          )}
        </div>
        {gameMode === "ai" && undoStack.length >= 2 && !result && (
          <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs gap-1.5" onClick={handleUndo}>
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Zug zurück
          </Button>
        )}
        {moveHistory.length > 0 && (
          <details className="shrink-0" style={{ width: boardSize }}>
            <summary className="text-xs text-muted-foreground cursor-pointer list-none py-1 text-center rounded hover:bg-muted/30">
              Zugliste ({moveHistory.length} Züge)
            </summary>
            <ul className="mt-1 rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs space-y-0.5 max-h-24 overflow-y-auto">
              {moveHistory.map((entry, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className={cn("font-medium", entry.color === "b" ? "text-foreground" : "text-muted-foreground")}>
                    {entry.color === "b" ? "Schwarz" : "Weiß"}:
                  </span>
                  <span>
                    {formatMoveNotation(entry.move)}
                    {entry.move.captures.length === 0 && (
                      <span className="text-muted-foreground ml-1">({getDirectionLabel(entry.move.from, entry.move.to)})</span>
                    )}
                    {entry.move.captures.length > 0 && (
                      <span className="text-destructive/80 ml-1">· {entry.move.captures.length} geschlagen</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="overflow-x-auto overflow-y-hidden flex justify-center py-2">
        <div className="inline-flex flex-col items-start">
          <div className="flex">
            {showCoordinates && (
              <div className={cn("flex flex-col justify-around text-xs font-medium pr-1 shrink-0", design.coord)} style={{ width: Math.max(18, cellSize * 0.4) }}>
                {RANK_LABELS.map((l) => (
                  <span key={l} className="flex items-center justify-center" style={{ height: cellSize }}>
                    {l}
                  </span>
                ))}
              </div>
            )}
            <div
              className="relative inline-block border-2 border-border rounded-lg overflow-hidden shadow-xl"
              style={{ width: boardSize, height: boardSize }}
            >
              <div className="grid grid-cols-8 gap-0" style={{ width: boardSize, height: boardSize }}>
                {board.map((row, r) =>
                  row.map((sq, c) => {
                    const dark = isDark(r, c)
                    const isAnimTarget =
                      !!animatingMove &&
                      animatingMove.path[animatingMove.path.length - 1].r === r &&
                      animatingMove.path[animatingMove.path.length - 1].c === c
                    return (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        onClick={() => dark && handleSquareClick({ r, c })}
                        style={{ width: cellSize, height: cellSize }}
                        className={cn(
                          "relative flex items-center justify-center select-none transition-colors shrink-0",
                          dark ? design.boardDark : design.boardLight,
                          isSelected(r, c) && "ring-2 ring-primary ring-inset",
                          dark && isPossible(r, c) && !board[r][c] && "bg-primary/30",
                          dark && isPossible(r, c) && board[r][c] && "bg-destructive/40",
                        )}
                      >
                        {/* Während der Animation: Ziel-Figur nicht doppelt zeichnen, nur den animierten Stein oben drüber. */}
                        {sq && dark && !isAnimTarget ? (
                          <>
                            <span
                              className={cn(
                                "rounded-full flex items-center justify-center text-xs font-bold",
                                sq.color === "w"
                                  ? sq.king
                                    ? design.pieceWhiteKing
                                    : design.pieceWhite
                                  : sq.king
                                    ? design.pieceBlackKing
                                    : design.pieceBlack,
                              )}
                              style={{
                                width: cellSize * 0.7,
                                height: cellSize * 0.7,
                                fontSize: sq.king ? cellSize * 0.35 : 0,
                              }}
                            >
                              {sq.king ? "♔" : ""}
                            </span>
                            {isPossible(r, c) && (
                              <span
                                className="absolute bottom-1 right-1 rounded-full bg-primary/80 ring-2 ring-background"
                                style={{ width: Math.max(5, cellSize * 0.18), height: Math.max(5, cellSize * 0.18) }}
                                aria-hidden
                              />
                            )}
                          </>
                        ) : dark && isPossible(r, c) ? (
                          <span
                            className="rounded-full bg-primary/50"
                            style={{ width: Math.max(4, cellSize * 0.2), height: Math.max(4, cellSize * 0.2) }}
                            aria-hidden
                          />
                        ) : null}
                        {dark && isCaptureTarget(r, c) && (
                          <span
                            className="absolute inset-0 m-auto rounded-full bg-destructive/80 ring-2 ring-background pointer-events-none"
                            style={{ width: Math.max(8, cellSize * 0.24), height: Math.max(8, cellSize * 0.24) }}
                            aria-hidden
                          />
                        )}
                      </button>
                    )
                  }),
                )}
              </div>
              {animatingMove && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  aria-hidden
                >
                  {(() => {
                    const fromPos = animatingMove.path[animatingMove.step]
                    const toPos =
                      animatingMove.path[Math.min(animatingMove.step + 1, animatingMove.path.length - 1)]
                    const fromCol = fromPos.c * cellSize + cellSize * 0.15
                    const fromRow = fromPos.r * cellSize + cellSize * 0.15
                    const toCol = toPos.c * cellSize + cellSize * 0.15
                    const toRow = toPos.r * cellSize + cellSize * 0.15
                    const left = animationPhase === "end" ? toCol : fromCol
                    const top = animationPhase === "end" ? toRow : fromRow
                    return (
                  <span
                    className={cn(
                      "absolute rounded-full flex items-center justify-center text-xs font-bold transition-all duration-350 ease-in-out",
                      animatingMove.color === "w"
                        ? "bg-white border-2 border-amber-900/30 shadow-md"
                        : "bg-neutral-800 border-2 border-amber-950/50 shadow-md",
                    )}
                    style={{
                      width: cellSize * 0.7,
                      height: cellSize * 0.7,
                      left,
                      top,
                    }}
                  />
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
          {showCoordinates && (
            <div className="flex mt-1" style={{ paddingLeft: Math.max(18, cellSize * 0.4) }}>
              <div className={cn("flex justify-around text-xs font-medium", design.coord)} style={{ width: boardSize }}>
                {FILE_LABELS.map((l) => (
                  <span key={l} style={{ width: cellSize, textAlign: "center" }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={onClose}>
        Beenden
      </Button>
    </div>
  )
}
