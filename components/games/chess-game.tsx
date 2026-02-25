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
  pieceSymbol,
  getChessAIMove,
  isInCheck,
  findKing,
  type Board,
  type Pos,
  type Color,
  type GameResult,
  type Piece,
  type PieceType,
  type ChessAIDifficulty,
} from "@/lib/chess"
import { ChessPieceModern } from "@/components/games/chess-pieces-modern"
import { ChessPiecePremium } from "@/components/games/chess-pieces-premium"
import { cn } from "@/lib/utils"
import { Settings2, ZoomIn, ZoomOut, RotateCcw, Users, Cpu, Trophy, BookOpen, ChevronDown, ChevronUp } from "lucide-react"

const POINTS_WIN = 30
const POINTS_DRAW = 10

const CHESS_PROGRESS_KEY = "famiapp-chess-progress"
const CHESS_XP_WIN = 30
const CHESS_XP_DRAW = 10
const CHESS_XP_PER_LEVEL = 100

const CHESS_GOLDEN_RULES = [
  "Bauern ziehen ein Feld vorwärts (oder zwei vom Start), schlagen diagonal.",
  "Türme, Läufer, Dame: gerade bzw. diagonal beliebig weit (ohne Überspringen).",
  "Springer: zwei plus eins Feld in L-Form, darf überspringen.",
  "König: ein Feld in jede Richtung. Schach = König bedroht, Matt = kein Ausweg.",
  "Patt = Unentschieden (am Zug, aber kein gültiger Zug ohne Schach).",
]

type ChessChallengeCtx = {
  moveCount: number
  result: GameResult
  humanWon: boolean
  capturedWhiteCount: number
  firstCaptureAtMove: number | null
}

const CHESS_CHALLENGE_POOL: { id: string; label: string; check: (ctx: ChessChallengeCtx) => boolean }[] = [
  { id: "blitz", label: "Blitzsieg: Gewinne in unter 25 Zügen", check: (ctx) => ctx.humanWon && ctx.moveCount < 25 },
  { id: "ohne-verlust", label: "Ohne Verlust: Gewinne ohne eine Figur abzugeben", check: (ctx) => ctx.humanWon && ctx.capturedWhiteCount === 0 },
  { id: "schnelles-matt", label: "Schnelles Matt: Schachmatt in unter 40 Zügen", check: (ctx) => ctx.result === "checkmate" && ctx.moveCount < 40 },
  { id: "erster-schlag", label: "Erster Schlag: Schlage in den ersten 10 Zügen eine Figur", check: (ctx) => ctx.firstCaptureAtMove !== null && ctx.firstCaptureAtMove <= 10 },
]

const FILE_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h"]
const RANK_LABELS = ["8", "7", "6", "5", "4", "3", "2", "1"]

/**
 * Kombinierte Designs: Brett + Figurenfarben mit starkem Kontrast.
 * Figuren nutzen wo nötig neutrale Schwarz/Weiß-Töne, damit sie nie im Brett untergehen.
 */
const CHESS_DESIGNS = [
  {
    id: "classicBoard",
    name: "Klassisch (wie Bild)",
    boardLight: "bg-white",
    boardDark: "bg-neutral-900",
    pieceWhite: "text-amber-500",
    pieceBlack: "text-amber-800",
    coord: "text-neutral-500 dark:text-neutral-400",
  },
  {
    id: "classic",
    name: "Klassisch Holz",
    boardLight: "bg-amber-100 dark:bg-amber-900/60",
    boardDark: "bg-amber-800 dark:bg-amber-950",
    pieceWhite: "text-amber-950 [text-shadow:0_0_2px_white,0_0_4px_white]",
    pieceBlack: "text-amber-50 [text-shadow:0_0_2px_black,0_0_4px_rgba(0,0,0,0.9)]",
    coord: "text-amber-900/80 dark:text-amber-200/80",
  },
  {
    id: "green",
    name: "Grünes Feld",
    boardLight: "bg-green-100 dark:bg-green-900/50",
    boardDark: "bg-green-800 dark:bg-green-950",
    pieceWhite: "text-neutral-900 [text-shadow:0_0_2px_white]",
    pieceBlack: "text-white [text-shadow:0_0_2px_black,0_0_3px_rgba(0,0,0,0.8)]",
    coord: "text-green-800/80 dark:text-green-200/80",
  },
  {
    id: "blue",
    name: "Blau",
    boardLight: "bg-sky-100 dark:bg-sky-900/50",
    boardDark: "bg-sky-700 dark:bg-sky-950",
    pieceWhite: "text-neutral-900 [text-shadow:0_0_2px_white]",
    pieceBlack: "text-white [text-shadow:0_0_2px_black]",
    coord: "text-sky-800/80 dark:text-sky-200/80",
  },
  {
    id: "marble",
    name: "Marmor",
    boardLight: "bg-stone-200 dark:bg-stone-600",
    boardDark: "bg-stone-600 dark:bg-stone-800",
    pieceWhite: "text-stone-900 [text-shadow:0_0_2px_white]",
    pieceBlack: "text-stone-100 [text-shadow:0_0_2px_black]",
    coord: "text-stone-700 dark:text-stone-300",
  },
  {
    id: "dark",
    name: "Dunkel",
    boardLight: "bg-zinc-500 dark:bg-zinc-600",
    boardDark: "bg-zinc-800 dark:bg-zinc-900",
    pieceWhite: "text-white [text-shadow:0_0_2px_black]",
    pieceBlack: "text-zinc-200 [text-shadow:0_0_2px_black]",
    coord: "text-zinc-400 dark:text-zinc-500",
  },
  {
    id: "cherry",
    name: "Kirsche",
    boardLight: "bg-rose-100 dark:bg-rose-900/50",
    boardDark: "bg-rose-700 dark:bg-rose-950",
    pieceWhite: "text-neutral-900 [text-shadow:0_0_2px_white]",
    pieceBlack: "text-white [text-shadow:0_0_2px_black]",
    coord: "text-rose-800/80 dark:text-rose-200/80",
  },
  {
    id: "ocean",
    name: "Ozean",
    boardLight: "bg-cyan-100 dark:bg-cyan-900/50",
    boardDark: "bg-blue-800 dark:bg-blue-950",
    pieceWhite: "text-neutral-900 [text-shadow:0_0_2px_white]",
    pieceBlack: "text-white [text-shadow:0_0_2px_black]",
    coord: "text-blue-800/80 dark:text-cyan-200/80",
  },
  {
    id: "purple",
    name: "Lila",
    boardLight: "bg-violet-100 dark:bg-violet-900/50",
    boardDark: "bg-violet-800 dark:bg-violet-950",
    pieceWhite: "text-neutral-900 [text-shadow:0_0_2px_white,0_0_3px_white]",
    pieceBlack: "text-white [text-shadow:0_0_2px_black,0_0_3px_rgba(0,0,0,0.9)]",
    coord: "text-violet-800/80 dark:text-violet-200/80",
  },
  {
    id: "modern",
    name: "Modern (zu neuen Figuren)",
    boardLight: "bg-slate-100 dark:bg-slate-700/60",
    boardDark: "bg-slate-600 dark:bg-slate-800",
    pieceWhite: "text-slate-900 [text-shadow:0_0_2px_white,0_0_3px_white]",
    pieceBlack: "text-slate-50 [text-shadow:0_0_2px_black,0_0_3px_rgba(0,0,0,0.8)]",
    coord: "text-slate-600/90 dark:text-slate-300/90",
  },
] as const

type DesignId = (typeof CHESS_DESIGNS)[number]["id"]

// Figurenfarben: Design oder immer stark (Schwarz/Weiß)
const STRONG_PIECE_WHITE = "text-neutral-900 drop-shadow-[0_0_1px_white] drop-shadow-[0_0_2px_white]"
const STRONG_PIECE_BLACK = "text-white drop-shadow-[0_0_1px_black] drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]"

const KING_IN_CHECK_CLASS = "text-red-600 dark:text-red-400 [text-shadow:0_0_2px_rgba(220,38,38,0.9)]"

function getPieceDisplay(
  piece: Piece,
  pieceSet: string,
  pieceColorMode: PieceColorModeId,
  design: (typeof CHESS_DESIGNS)[number],
  inCheck?: boolean,
  squareId?: string,
): React.ReactNode {
  const sym = pieceSymbol(piece)
  const isWhite = piece.color === "w"
  const colorClass = inCheck
    ? KING_IN_CHECK_CLASS
    : pieceColorMode === "strong"
      ? isWhite
        ? STRONG_PIECE_WHITE
        : STRONG_PIECE_BLACK
      : isWhite
        ? design.pieceWhite
        : design.pieceBlack
  const contrastRing = pieceColorMode === "design" && !inCheck ? "drop-shadow-[0_0_1px_currentColor]" : ""

  if (pieceSet === "classic") {
    return <span className={cn("font-serif", colorClass, contrastRing)}>{sym}</span>
  }
  if (pieceSet === "minimal") {
    const letters: Record<PieceType, string> = { K: "K", Q: "Q", R: "R", B: "B", N: "N", P: "P" }
    const letter = letters[piece.type]
    return (
      <span
        className={cn(
          "font-bold text-[0.6em] flex items-center justify-center w-full h-full rounded-full border-2",
          inCheck ? "bg-red-100 text-red-700 border-red-500 dark:bg-red-900/50 dark:text-red-300" : isWhite ? "bg-white/95 text-neutral-900 border-neutral-600" : "bg-neutral-800 text-white border-neutral-600",
        )}
      >
        {letter}
      </span>
    )
  }
  if (pieceSet === "outline") {
    return (
      <span className={cn("font-serif opacity-95 [text-shadow:0_0_1px_currentColor]", colorClass, contrastRing)}>
        {sym}
      </span>
    )
  }
  if (pieceSet === "premium") {
    return (
      <span className={cn("flex items-center justify-center w-full h-full [&_svg]:w-[88%] [&_svg]:h-[88%]", contrastRing)}>
        <ChessPiecePremium
          pieceType={piece.type}
          color={piece.color}
          inCheck={inCheck}
          gradientIdSuffix={squareId ?? `${piece.type}-${piece.color}`}
        />
      </span>
    )
  }
  if (pieceSet === "square") {
    const letters: Record<PieceType, string> = { K: "K", Q: "Q", R: "R", B: "B", N: "N", P: "P" }
    const letter = letters[piece.type]
    return (
      <span
        className={cn(
          "font-bold text-[0.55em] flex items-center justify-center w-full h-full rounded-md border-2",
          inCheck ? "bg-red-100 text-red-700 border-red-500 dark:bg-red-900/50 dark:text-red-300" : isWhite ? "bg-white/95 text-neutral-900 border-neutral-500" : "bg-neutral-800 text-white border-neutral-500",
        )}
      >
        {letter}
      </span>
    )
  }
  if (pieceSet === "modern") {
    return (
      <span className={cn("flex items-center justify-center w-full h-full [&_svg]:w-[88%] [&_svg]:h-[88%]", !inCheck && colorClass, contrastRing)}>
        <ChessPieceModern pieceType={piece.type} color={piece.color} inCheck={inCheck} className={!inCheck ? (isWhite ? design.pieceWhite : design.pieceBlack) : undefined} />
      </span>
    )
  }
  return <span className={cn(colorClass, contrastRing)}>{sym}</span>
}

const PIECE_SET_OPTIONS = [
  { id: "classic", name: "Unicode-Symbole (♔♕♖…)" },
  { id: "premium", name: "Premium (wie Bild)" },
  { id: "modern", name: "Zeichnung (Modern)" },
  { id: "minimal", name: "Buchstaben (K, Q, R…)" },
  { id: "outline", name: "Kontur" },
  { id: "square", name: "Eckig" },
] as const

type PieceSetId = (typeof PIECE_SET_OPTIONS)[number]["id"]

const PIECE_COLOR_OPTIONS = [
  { id: "design", name: "Zum Brett passend (harmonisch)" },
  { id: "strong", name: "Stark – immer Schwarz/Weiß (gut sichtbar)" },
] as const

type PieceColorModeId = (typeof PIECE_COLOR_OPTIONS)[number]["id"]

const GAME_MODES = [
  { id: "two", name: "Zwei Spieler", icon: Users },
  { id: "computer", name: "Gegen KI", icon: Cpu },
] as const

const CHESS_AI_DIFFICULTIES: { id: ChessAIDifficulty; name: string }[] = [
  { id: "easy", name: "KI: Leicht" },
  { id: "medium", name: "KI: Mittel" },
  { id: "hard", name: "KI: Schwer" },
]

type GameModeId = (typeof GAME_MODES)[number]["id"]

const BOARD_SIZE_MIN = 280
const BOARD_SIZE_MAX = 700
const BOARD_SIZE_DEFAULT = 400

const CHESS_STORAGE_KEY = "famiapp-chess-save"
const CHESS_PREFS_KEY = "famiapp-chess-prefs"

type ChessMoveEntry = { move: { from: Pos; to: Pos; captured: Piece | null }; color: Color }
type ChessUndoState = {
  board: Board
  turn: Color
  capturedWhite: PieceType[]
  capturedBlack: PieceType[]
  lastMove: { from: Pos; to: Pos; captured: Piece | null } | null
  moveCount: number
  moveHistory: ChessMoveEntry[]
}

interface ChessSaveState {
  board: Board
  turn: Color
  capturedWhite: PieceType[]
  capturedBlack: PieceType[]
  result: GameResult
  gameMode: GameModeId
  aiDifficulty?: ChessAIDifficulty
  designId: DesignId
  pieceSetId: PieceSetId
  pieceColorMode: PieceColorModeId
  boardSize: number
  showCoordinates: boolean
  lastMove?: { from: Pos; to: Pos; captured: Piece | null } | null
  moveHistory?: ChessMoveEntry[]
}

function loadChessSave(): ChessSaveState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CHESS_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as ChessSaveState
    if (!data || !Array.isArray(data.board) || data.board.length !== 8) return null
    return data
  } catch {
    return null
  }
}

function saveChessSave(state: ChessSaveState): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CHESS_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

/** Brett-Design, Figuren-Set und Anzeige – getrennt gespeichert, bleibt auch nach mehreren Neustarts erhalten. */
type ChessPrefs = Pick<ChessSaveState, "designId" | "pieceSetId" | "pieceColorMode" | "boardSize" | "showCoordinates">

function loadChessPrefs(): ChessPrefs | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CHESS_PREFS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ChessPrefs
  } catch {
    return null
  }
}

function saveChessPrefs(prefs: ChessPrefs): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CHESS_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

interface ChessGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
}

export function ChessGame({ onAwardPoints, onClose }: ChessGameProps) {
  const [board, setBoard] = useState<Board>(() => createInitialBoard())
  const [turn, setTurn] = useState<Color>("w")
  const [selected, setSelected] = useState<Pos | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Pos[]>([])
  const [result, setResult] = useState<GameResult>(null)
  const [hasAwarded, setHasAwarded] = useState(false)
  const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([])
  const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([])
  const [lastMove, setLastMove] = useState<{ from: Pos; to: Pos; captured: Piece | null } | null>(null)
  const [moveHistory, setMoveHistory] = useState<ChessMoveEntry[]>([])

  const [gameMode, setGameMode] = useState<GameModeId>("two")
  const [aiDifficulty, setAiDifficulty] = useState<ChessAIDifficulty>("medium")
  const [boardSize, setBoardSize] = useState(BOARD_SIZE_DEFAULT)
  const [designId, setDesignId] = useState<DesignId>("classic")
  const [pieceSetId, setPieceSetId] = useState<PieceSetId>("classic")
  const [pieceColorMode, setPieceColorMode] = useState<PieceColorModeId>("design")
  const [showSettings, setShowSettings] = useState(false)
  const [showCoordinates, setShowCoordinates] = useState(true)
  const [showNewGameChoice, setShowNewGameChoice] = useState(false)
  const [isComputerThinking, setIsComputerThinking] = useState(false)
  const computerMoveAllowedRef = useRef(false)
  const [chessLevel, setChessLevel] = useState(1)
  const [chessXp, setChessXp] = useState(0)
  const [chessXpAwarded, setChessXpAwarded] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [moveCount, setMoveCount] = useState(0)
  const [firstCaptureAtMove, setFirstCaptureAtMove] = useState<number | null>(null)
  const [challenges, setChallenges] = useState<typeof CHESS_CHALLENGE_POOL>(() => [...CHESS_CHALLENGE_POOL].sort(() => Math.random() - 0.5).slice(0, 3))
  const [undoStack, setUndoStack] = useState<ChessUndoState[]>([])
  const prevTurnRef = useRef<Color | null>(null)
  const skipNextPushRef = useRef(false)

  const design = CHESS_DESIGNS.find((d) => d.id === designId) ?? CHESS_DESIGNS[0]

  // Im KI-Modus: Zustand zu Beginn jedes menschlichen Zugs für „Zug zurück“ speichern
  useEffect(() => {
    if (result || gameMode !== "computer") {
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
    const state: ChessUndoState = {
      board: board.map((row) => row.map((s) => (s ? { ...s } : null))),
      turn: "w",
      capturedWhite: [...capturedWhite],
      capturedBlack: [...capturedBlack],
      lastMove: lastMove ? { ...lastMove } : null,
      moveCount,
      moveHistory: moveHistory.map((e) => ({ move: { ...e.move }, color: e.color })),
    }
    setUndoStack((s) => (s.length > 20 ? [...s.slice(-19), state] : [...s, state]))
    prevTurnRef.current = "w"
  }, [turn, board, moveCount, capturedWhite, capturedBlack, lastMove, moveHistory, result, gameMode])

  const handleUndo = useCallback(() => {
    if (gameMode !== "computer" || undoStack.length < 2 || result) return
    skipNextPushRef.current = true
    const prev = undoStack[undoStack.length - 2]
    setBoard(prev.board)
    setTurn(prev.turn)
    setCapturedWhite(prev.capturedWhite)
    setCapturedBlack(prev.capturedBlack)
    setLastMove(prev.lastMove)
    setMoveCount(prev.moveCount)
    setMoveHistory(prev.moveHistory ?? [])
    setResult(null)
    setSelected(null)
    setPossibleMoves([])
    setUndoStack((s) => s.slice(0, -2))
  }, [gameMode, undoStack, result])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHESS_PROGRESS_KEY)
      if (raw) {
        const { level = 1, xp = 0 } = JSON.parse(raw)
        setChessLevel(level)
        setChessXp(xp)
      }
    } catch {
      // ignore
    }
  }, [])

  // Gespeicherten Stand + Design-Prefs laden (nur einmal beim Mount)
  const [hasLoadedSave, setHasLoadedSave] = useState(false)
  useEffect(() => {
    if (hasLoadedSave) return
    setHasLoadedSave(true)
    const saved = loadChessSave()
    if (saved) {
      setBoard(saved.board)
      setTurn(saved.turn)
      setCapturedWhite(saved.capturedWhite ?? [])
      setCapturedBlack(saved.capturedBlack ?? [])
      setLastMove(saved.lastMove ?? null)
      const history = saved.moveHistory ?? []
      setMoveHistory(history)
      setMoveCount(history.length)
      setResult(saved.result)
      setGameMode(saved.gameMode ?? "two")
      if (saved.aiDifficulty) setAiDifficulty(saved.aiDifficulty)
      if (saved.designId) setDesignId(saved.designId)
      if (saved.pieceSetId) setPieceSetId((saved.pieceSetId as string) === "bold" ? "premium" : saved.pieceSetId)
      if (saved.pieceColorMode) setPieceColorMode(saved.pieceColorMode)
      if (saved.boardSize != null) setBoardSize(saved.boardSize)
      if (saved.showCoordinates != null) setShowCoordinates(saved.showCoordinates)
    } else {
      // Kein Spielstand: Design/Figuren/Anzeige aus zuletzt gespeicherten Prefs laden
      const prefs = loadChessPrefs()
      if (prefs) {
        if (prefs.designId) setDesignId(prefs.designId as DesignId)
        if (prefs.pieceSetId) setPieceSetId(((prefs.pieceSetId as string) === "bold" ? "premium" : prefs.pieceSetId) as PieceSetId)
        if (prefs.pieceColorMode) setPieceColorMode(prefs.pieceColorMode as PieceColorModeId)
        if (prefs.boardSize != null) setBoardSize(prefs.boardSize)
        if (prefs.showCoordinates != null) setShowCoordinates(prefs.showCoordinates)
      }
    }
  }, [hasLoadedSave])

  // Spielstand speichern bei Änderung und beim Verlassen (App schließen / Tab wechseln)
  const chessSaveRef = useRef<ChessSaveState | null>(null)
  useEffect(() => {
    const state: ChessSaveState = {
      board,
      turn,
      capturedWhite,
      capturedBlack,
      result,
      gameMode,
      aiDifficulty,
      designId,
      pieceSetId,
      pieceColorMode,
      boardSize,
      showCoordinates,
      lastMove,
      moveHistory,
    }
    chessSaveRef.current = state
    saveChessSave(state)
    saveChessPrefs({ designId, pieceSetId, pieceColorMode, boardSize, showCoordinates })
  }, [board, turn, capturedWhite, capturedBlack, result, gameMode, aiDifficulty, designId, pieceSetId, pieceColorMode, boardSize, showCoordinates, lastMove, moveHistory])

  useEffect(() => {
    const flush = () => {
      if (chessSaveRef.current) saveChessSave(chessSaveRef.current)
    }
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") flush() }
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  // Computer-Zug nur, wenn Mensch (Weiß) gerade gezogen hat
  useEffect(() => {
    if (result || gameMode !== "computer" || turn !== "b" || !computerMoveAllowedRef.current) return
    computerMoveAllowedRef.current = false
    const move = getChessAIMove(board, "b", aiDifficulty)
    if (!move) return
    setIsComputerThinking(true)
    const t = setTimeout(() => {
      const { board: nextBoard, captured } = applyMove(board, move.from, move.to, "b")
      setBoard(nextBoard)
      if (captured) {
        if (captured.color === "w") setCapturedWhite((prev) => [...prev, captured.type])
        else setCapturedBlack((prev) => [...prev, captured.type])
      }
      setLastMove({ from: move.from, to: move.to, captured: captured ?? null })
      setMoveHistory((h) => [...h, { move: { from: move.from, to: move.to, captured: captured ?? null }, color: "b" }])
      setMoveCount((n) => n + 1)
      setTurn("w")
      setIsComputerThinking(false)
    }, 500)
    return () => clearTimeout(t)
  }, [result, gameMode, turn, board, aiDifficulty])

  const checkResult = useCallback(() => {
    const res = getGameResult(board, turn)
    setResult(res)
    if (res && !hasAwarded) {
      setHasAwarded(true)
      if (res === "checkmate") {
        const winner = turn === "w" ? "b" : "w"
        if (winner === "w") {
          onAwardPoints(POINTS_WIN, "Schachmatt! Du gewinnst! 🏆")
        }
      } else if (res === "stalemate") {
        onAwardPoints(POINTS_DRAW, "Patt – Unentschieden! 🤝")
      }
    }
  }, [board, turn, hasAwarded, onAwardPoints])

  useEffect(() => {
    checkResult()
  }, [checkResult])

  useEffect(() => {
    if (!result || chessXpAwarded) return
    setChessXpAwarded(true)
    const win = result === "checkmate" && (turn === "b" || (turn === "w" && gameMode === "two"))
    const draw = result === "stalemate"
    const addXp = win ? CHESS_XP_WIN : draw ? CHESS_XP_DRAW : 0
    if (addXp <= 0) return
    const next = chessXp + addXp
    const level = Math.max(1, Math.floor(next / CHESS_XP_PER_LEVEL) + 1)
    setChessXp(next)
    setChessLevel(level)
    try {
      localStorage.setItem(CHESS_PROGRESS_KEY, JSON.stringify({ level, xp: next }))
    } catch {
      // ignore
    }
  }, [result, turn, gameMode, chessXp, chessXpAwarded])

  const handleSquareClick = (pos: Pos) => {
    if (result || isComputerThinking) return
    if (gameMode === "computer" && turn === "b") return

    const piece = board[pos.r][pos.c]

    if (selected) {
      const isMove = possibleMoves.some((m) => m.r === pos.r && m.c === pos.c)
      if (isMove) {
        const { board: nextBoard, captured } = applyMove(board, selected, pos, turn)
        setBoard(nextBoard)
        if (captured) {
          if (captured.color === "w") setCapturedWhite((prev) => [...prev, captured.type])
          else setCapturedBlack((prev) => [...prev, captured.type])
          if (turn === "w") setFirstCaptureAtMove((m) => (m === null ? moveCount + 1 : m))
        }
        setLastMove({ from: selected, to: pos, captured: captured ?? null })
        setMoveHistory((h) => [...h, { move: { from: selected, to: pos, captured: captured ?? null }, color: turn }])
        setMoveCount((n) => n + 1)
        const nextTurn = turn === "w" ? "b" : "w"
        setTurn(nextTurn)
        if (gameMode === "computer" && nextTurn === "b") computerMoveAllowedRef.current = true
        setSelected(null)
        setPossibleMoves([])
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

  const startNewGame = (mode: GameModeId) => {
    setGameMode(mode)
    setShowNewGameChoice(false)
    setBoard(createInitialBoard())
    setTurn("w")
    setSelected(null)
    setPossibleMoves([])
    setResult(null)
    setHasAwarded(false)
    setCapturedWhite([])
    setCapturedBlack([])
    setLastMove(null)
    setMoveHistory([])
    setChessXpAwarded(false)
    setMoveCount(0)
    setFirstCaptureAtMove(null)
    setChallenges([...CHESS_CHALLENGE_POOL].sort(() => Math.random() - 0.5).slice(0, 3))
    setUndoStack([])
    prevTurnRef.current = null
    computerMoveAllowedRef.current = false
  }

  const resetGame = () => {
    setShowNewGameChoice(true)
  }

  const isLight = (r: number, c: number) => (r + c) % 2 === 0
  const isSelected = (r: number, c: number) => selected?.r === r && selected?.c === c
  const isPossible = (r: number, c: number) => possibleMoves.some((m) => m.r === r && m.c === c)

  const kingInCheckPos = result === null && isInCheck(board, turn) ? findKing(board, turn) : null
  const isKingInCheckSquare = (r: number, c: number) =>
    kingInCheckPos !== null && kingInCheckPos.r === r && kingInCheckPos.c === c

  const humanWon = result === "checkmate" && (turn === "b" || (turn === "w" && gameMode === "two"))
  const chessChallengeCtx: ChessChallengeCtx = {
    moveCount,
    result,
    humanWon,
    capturedWhiteCount: capturedWhite.length,
    firstCaptureAtMove,
  }
  const challengeResults = challenges.map((ch) => ({ ...ch, done: result !== null && ch.check(chessChallengeCtx) }))

  const getPieceColorClass = (color: Color) =>
    pieceColorMode === "strong"
      ? color === "w"
        ? STRONG_PIECE_WHITE
        : STRONG_PIECE_BLACK
      : color === "w"
        ? design.pieceWhite
        : design.pieceBlack

  const posToNotation = (p: Pos) => `${"abcdefgh"[p.c]}${8 - p.r}`
  const pieceTypeName: Record<PieceType, string> = { K: "König", Q: "Dame", R: "Turm", B: "Läufer", N: "Springer", P: "Bauer" }

  const renderCaptured = (types: PieceType[], color: Color) => {
    const order: PieceType[] = ["Q", "R", "B", "N", "P"]
    const sorted = [...types].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    return (
      <div className="flex flex-wrap gap-1 items-center min-h-[1.5rem]">
        {sorted.map((t, i) => {
          const piece: Piece = { color, type: t }
          return (
            <span
              key={`${color}-${t}-${i}`}
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded border border-border/50 bg-muted/30 text-lg leading-none shrink-0",
                getPieceColorClass(color),
              )}
            >
              {pieceSymbol(piece)}
            </span>
          )
        })}
      </div>
    )
  }

  if (result && !showNewGameChoice) {
    const completed = challengeResults.filter((ch) => ch.done).length
    return (
      <div className="space-y-6 text-center py-8">
        <p className="text-2xl font-bold text-foreground">
          {result === "checkmate"
            ? turn === "w"
              ? "Schwarz gewinnt!"
              : "Weiß gewinnt!"
            : "Patt – Unentschieden"}
        </p>
        <p className="text-muted-foreground">
          {result === "checkmate" && turn === "b" && `+${POINTS_WIN} Goldmünzen für dich!`}
          {result === "stalemate" && `+${POINTS_DRAW} Goldmünzen`}
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
      {/* Overlay: Neues Spiel – Modus wählen */}
      {showNewGameChoice && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-xl">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xl max-w-sm w-full mx-4 space-y-4">
            <p className="text-lg font-semibold text-foreground text-center">Neues Spiel</p>
            <p className="text-sm text-muted-foreground text-center">Wie möchtest du spielen?</p>
            <div className="grid gap-3">
              {GAME_MODES.map((mode) => {
                const Icon = mode.icon
                return (
                  <Button
                    key={mode.id}
                    variant="outline"
                    className="h-12 justify-start gap-3"
                    onClick={() => startNewGame(mode.id)}
                  >
                    <Icon className="h-5 w-5" />
                    {mode.name}
                  </Button>
                )
              })}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setShowNewGameChoice(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
      {/* Infoleiste */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
            <Trophy className="h-3.5 w-3.5" />
            Level {chessLevel}
            {chessLevel <= 5 && " (Lehrling)"}
            {chessLevel >= 6 && chessLevel <= 15 && " (Geselle)"}
            {chessLevel >= 16 && chessLevel <= 30 && " (Meister)"}
            {chessLevel > 30 && " (Endlos)"}
          </span>
          <p className="text-sm text-muted-foreground">
            Du spielst <strong>Weiß</strong> (unten). Sieg = +{POINTS_WIN} Goldmünzen, Patt = +{POINTS_DRAW} Goldmünzen.
          </p>
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
        {/* Die goldenen Regeln (aufklappbar) */}
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
              {CHESS_GOLDEN_RULES.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Herausforderungen */}
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
            <Select value={gameMode} onValueChange={(v) => setGameMode(v as GameModeId)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAME_MODES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {gameMode === "computer" && (
              <div className="mt-3">
                <label className="text-xs text-muted-foreground block mb-1">KI-Schwierigkeit</label>
                <Select value={aiDifficulty} onValueChange={(v) => setAiDifficulty(v as ChessAIDifficulty)}>
                  <SelectTrigger className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHESS_AI_DIFFICULTIES.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {aiDifficulty === "hard" && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Schwer nutzt Taktik: Zentrum, Entwicklung, Schach – u. a. Fallen wie Legal-Matt, Angelrute.
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Gegen KI: Du spielst Weiß, die KI spielt Schwarz.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Brett-Design</label>
              <Select value={designId} onValueChange={(v) => setDesignId(v as DesignId)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHESS_DESIGNS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Figuren-Symbol</label>
              <Select value={pieceSetId} onValueChange={(v) => setPieceSetId(v as PieceSetId)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIECE_SET_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="flex items-center gap-2">
                        {o.id === "classic" && <span className="text-base">♔</span>}
                        {o.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Darstellung der Figuren auf dem Brett.</p>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Figurenfarben (Kontrast)</label>
            <Select value={pieceColorMode} onValueChange={(v) => setPieceColorMode(v as PieceColorModeId)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIECE_COLOR_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">„Stark“ sorgt für klare Sichtbarkeit auf jedem Brett.</p>
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
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showCoordinates}
              onChange={(e) => setShowCoordinates(e.target.checked)}
              className="rounded border-border"
            />
            Koordinaten (a–h, 1–8) anzeigen
          </label>
        </div>
      )}

      {/* Geschlagene Figuren */}
      <div className="flex justify-between gap-4 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">Geschlagen (Weiß)</p>
          {renderCaptured(capturedWhite, "w")}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs text-muted-foreground mb-0.5">Geschlagen (Schwarz)</p>
          {renderCaptured(capturedBlack, "b")}
        </div>
      </div>

      {/* Letzter Zug inkl. Schlagen */}
      {lastMove && (
        <div className="rounded-lg px-3 py-2 border border-border bg-muted/30 text-center">
          <p className="text-xs font-medium text-foreground">
            Letzter Zug: {posToNotation(lastMove.from)}
            {lastMove.captured ? " × " : " – "}
            {posToNotation(lastMove.to)}
            {lastMove.captured && (
              <span className="ml-2 text-destructive/90">
                · geschlagen: <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-border/50 bg-muted/50 text-sm align-middle">{pieceSymbol(lastMove.captured)}</span>{" "}
                {pieceTypeName[lastMove.captured.type]}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Zug-Anzeige: Status, Zug zurück, Zugliste – untereinander wie bei Dame */}
      <div className="overflow-x-auto flex justify-center py-2">
        <div className="inline-flex flex-col items-start">
          <div className="flex">
            {showCoordinates && (
              <div className="shrink-0" style={{ width: Math.max(18, cellSize * 0.4) }} />
            )}
            <div className="space-y-2 flex flex-col items-center shrink-0" style={{ width: boardSize }}>
              <div
                className={cn(
                  "rounded-lg px-3 py-2 flex items-center justify-center gap-2 border w-full",
                  isComputerThinking && "bg-muted/80 text-muted-foreground border-border",
                  !isComputerThinking && turn === "w" && "bg-white dark:bg-zinc-200 text-neutral-900 border-amber-400/50 ring-1 ring-primary/20",
                  !isComputerThinking && turn === "b" && "bg-neutral-800 dark:bg-zinc-800 text-white border-amber-600/50 ring-1 ring-primary/20",
                )}
              >
                {isComputerThinking ? (
                  <span className="text-xs font-medium">Computer denkt nach…</span>
                ) : (
                  <>
                    <span
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full text-lg shrink-0",
                        turn === "w" ? "bg-white text-neutral-900" : "bg-neutral-800 text-white",
                      )}
                      aria-hidden
                    >
                      {turn === "w" ? "♔" : "♚"}
                    </span>
                    <span className="text-xs font-medium">
                      {turn === "w" ? "Weiß" : "Schwarz"} am Zug
                      <span className="text-muted-foreground/80 mx-1">·</span>
                      {turn === "w" ? "Du bist dran" : gameMode === "computer" ? "KI" : "Du bist dran"}
                    </span>
                  </>
                )}
              </div>
              {gameMode === "computer" && undoStack.length >= 2 && !result && (
                <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto shrink-0 text-xs gap-1.5" onClick={handleUndo}>
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Zug zurück
                </Button>
              )}
              {moveHistory.length > 0 && (
                <details className="shrink-0 w-full" style={{ width: boardSize }}>
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
                          {posToNotation(entry.move.from)} → {posToNotation(entry.move.to)}
                          {entry.move.captured && (
                            <span className="text-destructive/80 ml-1">· geschlagen</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Brett mit optionalen Koordinaten */}
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
              className="inline-block border-2 border-border rounded-lg overflow-hidden shadow-xl"
              style={{ width: boardSize, height: boardSize }}
            >
              <div className="grid grid-cols-8 gap-0" style={{ width: boardSize, height: boardSize }}>
                {board.map((row, r) =>
                  row.map((sq, c) => (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      onClick={() => handleSquareClick({ r, c })}
                      style={{ width: cellSize, height: cellSize }}
                      className={cn(
                        "relative flex items-center justify-center select-none transition-colors shrink-0",
                        isLight(r, c) ? design.boardLight : design.boardDark,
                        isSelected(r, c) && "ring-2 ring-primary ring-inset",
                        isPossible(r, c) && !board[r][c] && "bg-primary/25",
                        isPossible(r, c) && board[r][c] && "bg-destructive/40",
                        isKingInCheckSquare(r, c) && "ring-2 ring-red-500 ring-inset bg-red-500/40",
                      )}
                    >
                      {sq ? (
                        <>
                          <span style={{ fontSize: cellSize * 0.65 }} className="flex items-center justify-center">
                            {getPieceDisplay(sq, pieceSetId, pieceColorMode, design, isKingInCheckSquare(r, c) && sq.type === "K", `${r}-${c}`)}
                          </span>
                          {isPossible(r, c) && (
                            <span
                              className="absolute bottom-1 right-1 rounded-full bg-primary/80 ring-2 ring-background"
                              style={{ width: Math.max(5, cellSize * 0.18), height: Math.max(5, cellSize * 0.18) }}
                              aria-hidden
                            />
                          )}
                        </>
                      ) : isPossible(r, c) ? (
                        <span
                          className="rounded-full bg-primary/50"
                          style={{ width: Math.max(4, cellSize * 0.2), height: Math.max(4, cellSize * 0.2) }}
                        />
                      ) : null}
                    </button>
                  )),
                )}
              </div>
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
