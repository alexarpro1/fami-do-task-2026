/**
 * Einfache Schach-Logik für FamiApp (Züge, Schach, Matt).
 * Kein Rochade/En-passant in v1.
 */

export type Color = "w" | "b"
export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P"

export interface Piece {
  color: Color
  type: PieceType
}

export type Square = Piece | null
export type Board = Square[][]

export interface Pos {
  r: number
  c: number
}

const PIECE_SYMBOLS: Record<Color, Record<PieceType, string>> = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
}

export function pieceSymbol(piece: Piece): string {
  return PIECE_SYMBOLS[piece.color][piece.type]
}

function createPiece(color: Color, type: PieceType): Piece {
  return { color, type }
}

export function createInitialBoard(): Board {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null))

  const backRank = (color: Color): Piece[] => [
    createPiece(color, "R"),
    createPiece(color, "N"),
    createPiece(color, "B"),
    createPiece(color, "Q"),
    createPiece(color, "K"),
    createPiece(color, "B"),
    createPiece(color, "N"),
    createPiece(color, "R"),
  ]

  const row = (color: Color, r: number) => {
    for (let c = 0; c < 8; c++) board[r][c] = createPiece(color, "P")
  }

  const rank = (color: Color, r: number) => {
    backRank(color).forEach((p, c) => (board[r][c] = p))
  }

  rank("b", 0)
  row("b", 1)
  row("w", 6)
  rank("w", 7)

  return board
}

export function inBounds(pos: Pos): boolean {
  return pos.r >= 0 && pos.r < 8 && pos.c >= 0 && pos.c < 8
}

export function getPiece(board: Board, pos: Pos): Square {
  return inBounds(pos) ? board[pos.r][pos.c] : null
}

function copyBoard(board: Board): Board {
  return board.map((row) => row.map((s) => (s ? { ...s } : null)))
}

export function getMoves(board: Board, pos: Pos, turn: Color): Pos[] {
  const piece = getPiece(board, pos)
  if (!piece || piece.color !== turn) return []

  const moves: Pos[] = []
  const add = (r: number, c: number) => {
    const to = { r, c }
    if (!inBounds(to)) return
    const target = getPiece(board, to)
    if (!target || target.color !== piece.color) moves.push(to)
  }

  const addRay = (dr: number, dc: number) => {
    let r = pos.r + dr
    let c = pos.c + dc
    while (inBounds({ r, c })) {
      const target = getPiece(board, { r, c })
      if (!target) {
        moves.push({ r, c })
        r += dr
        c += dc
        continue
      }
      if (target.color !== piece.color) moves.push({ r, c })
      break
    }
  }

  switch (piece.type) {
    case "P": {
      const dir = piece.color === "w" ? -1 : 1
      const startRow = piece.color === "w" ? 6 : 1
      const nr = pos.r + dir
      if (inBounds({ r: nr, c: pos.c }) && !getPiece(board, { r: nr, c: pos.c })) {
        moves.push({ r: nr, c: pos.c })
        if (pos.r === startRow && !getPiece(board, { r: pos.r + 2 * dir, c: pos.c })) {
          moves.push({ r: pos.r + 2 * dir, c: pos.c })
        }
      }
      for (const dc of [-1, 1]) {
        const to = { r: nr, c: pos.c + dc }
        if (inBounds(to)) {
          const t = getPiece(board, to)
          if (t && t.color !== piece.color) moves.push(to)
        }
      }
      break
    }
    case "N": {
      for (const [dr, dc] of [
        [2, 1],
        [2, -1],
        [-2, 1],
        [-2, -1],
        [1, 2],
        [1, -2],
        [-1, 2],
        [-1, -2],
      ]) {
        add(pos.r + dr, pos.c + dc)
      }
      break
    }
    case "K": {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) if (dr || dc) add(pos.r + dr, pos.c + dc)
      break
    }
    case "B":
      addRay(1, 1)
      addRay(1, -1)
      addRay(-1, 1)
      addRay(-1, -1)
      break
    case "R":
      addRay(1, 0)
      addRay(-1, 0)
      addRay(0, 1)
      addRay(0, -1)
      break
    case "Q":
      addRay(1, 0)
      addRay(-1, 0)
      addRay(0, 1)
      addRay(0, -1)
      addRay(1, 1)
      addRay(1, -1)
      addRay(-1, 1)
      addRay(-1, -1)
      break
  }

  return moves.filter((to) => !wouldLeaveKingInCheck(board, pos, to, turn))
}

export function findKing(board: Board, color: Color): Pos | null {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = getPiece(board, { r, c })
      if (p?.type === "K" && p.color === color) return { r, c }
    }
  return null
}

function isSquareAttacked(board: Board, pos: Pos, byColor: Color): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const piece = getPiece(board, { r, c })
      if (piece?.color === byColor) {
        const moves = getMovesIgnoringKing(board, { r, c }, byColor)
        if (moves.some((m) => m.r === pos.r && m.c === pos.c)) return true
      }
    }
  return false
}

function getMovesIgnoringKing(board: Board, pos: Pos, turn: Color): Pos[] {
  const piece = getPiece(board, pos)
  if (!piece || piece.color !== turn) return []

  const moves: Pos[] = []
  const add = (r: number, c: number) => {
    const to = { r, c }
    if (!inBounds(to)) return
    const target = getPiece(board, to)
    if (!target || target.color !== piece.color) moves.push(to)
  }
  const addRay = (dr: number, dc: number) => {
    let r = pos.r + dr
    let c = pos.c + dc
    while (inBounds({ r, c })) {
      const target = getPiece(board, { r, c })
      if (!target) {
        moves.push({ r, c })
        r += dr
        c += dc
        continue
      }
      if (target.color !== piece.color) moves.push({ r, c })
      break
    }
  }

  switch (piece.type) {
    case "P": {
      const dir = piece.color === "w" ? -1 : 1
      const startRow = piece.color === "w" ? 6 : 1
      const nr = pos.r + dir
      if (inBounds({ r: nr, c: pos.c }) && !getPiece(board, { r: nr, c: pos.c })) {
        moves.push({ r: nr, c: pos.c })
        if (pos.r === startRow && !getPiece(board, { r: pos.r + 2 * dir, c: pos.c })) {
          moves.push({ r: pos.r + 2 * dir, c: pos.c })
        }
      }
      for (const dc of [-1, 1]) {
        const to = { r: nr, c: pos.c + dc }
        if (inBounds(to)) {
          const t = getPiece(board, to)
          if (t && t.color !== piece.color) moves.push(to)
        }
      }
      break
    }
    case "N":
      for (const [dr, dc] of [
        [2, 1],
        [2, -1],
        [-2, 1],
        [-2, -1],
        [1, 2],
        [1, -2],
        [-1, 2],
        [-1, -2],
      ]) {
        add(pos.r + dr, pos.c + dc)
      }
      break
    case "K":
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) if (dr || dc) add(pos.r + dr, pos.c + dc)
      break
    case "B":
      addRay(1, 1)
      addRay(1, -1)
      addRay(-1, 1)
      addRay(-1, -1)
      break
    case "R":
      addRay(1, 0)
      addRay(-1, 0)
      addRay(0, 1)
      addRay(0, -1)
      break
    case "Q":
      addRay(1, 0)
      addRay(-1, 0)
      addRay(0, 1)
      addRay(0, -1)
      addRay(1, 1)
      addRay(1, -1)
      addRay(-1, 1)
      addRay(-1, -1)
      break
  }
  return moves
}

function wouldLeaveKingInCheck(board: Board, from: Pos, to: Pos, turn: Color): boolean {
  const next = copyBoard(board)
  next[to.r][to.c] = next[from.r][from.c]
  next[from.r][from.c] = null
  const kingPos = findKing(next, turn)
  return kingPos ? isSquareAttacked(next, kingPos, turn === "w" ? "b" : "w") : false
}

export function isInCheck(board: Board, turn: Color): boolean {
  const kingPos = findKing(board, turn)
  return kingPos ? isSquareAttacked(board, kingPos, turn === "w" ? "b" : "w") : false
}

function hasAnyLegalMove(board: Board, turn: Color): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const moves = getMoves(board, { r, c }, turn)
      if (moves.length > 0) return true
    }
  return false
}

export type GameResult = "checkmate" | "stalemate" | null

export function getGameResult(board: Board, turn: Color): GameResult {
  const hasMove = hasAnyLegalMove(board, turn)
  const check = isInCheck(board, turn)
  if (!hasMove) return check ? "checkmate" : "stalemate"
  return null
}

export function applyMove(
  board: Board,
  from: Pos,
  to: Pos,
  turn: Color
): { board: Board; promoted: boolean; captured: Piece | null } {
  const next = copyBoard(board)
  const piece = next[from.r][from.c]
  if (!piece) return { board: next, promoted: false, captured: null }

  const captured = next[to.r][to.c] ?? null
  next[to.r][to.c] = piece
  next[from.r][from.c] = null

  let promoted = false
  if (piece.type === "P" && (to.r === 0 || to.r === 7)) {
    next[to.r][to.c] = { ...piece, type: "Q" }
    promoted = true
  }

  return { board: next, promoted, captured }
}

/** Alle legalen Züge einer Farbe: [{ from, to }, ...] */
export function getAllMoves(board: Board, turn: Color): { from: Pos; to: Pos }[] {
  const moves: { from: Pos; to: Pos }[] = []
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const from = { r, c }
      const targets = getMoves(board, from, turn)
      for (const to of targets) moves.push({ from, to })
    }
  }
  return moves
}

/** Einfache KI: bevorzugt Schlagzüge, sonst zufälliger Zug */
export function getSimpleAIMove(board: Board, turn: Color): { from: Pos; to: Pos } | null {
  const all = getAllMoves(board, turn)
  if (all.length === 0) return null
  const captures = all.filter(({ to }) => getPiece(board, to) != null)
  const pool = captures.length > 0 ? captures : all
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

/** KI-Schwierigkeit wie bei Dame (Leicht / Mittel / Schwer) */
export type ChessAIDifficulty = "easy" | "medium" | "hard"

const PIECE_VALUES: Record<PieceType, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 }

function nextTurn(turn: Color): Color {
  return turn === "w" ? "b" : "w"
}

/** Einfache Bewertung: nur Material. */
function evaluateBoardSimple(board: Board, forColor: Color): number {
  let score = 0
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = getPiece(board, { r, c })
      if (!p) continue
      score += p.color === forColor ? PIECE_VALUES[p.type] : -PIECE_VALUES[p.type]
    }
  }
  return score
}

/** Zentrum (e4, e5, d4, d5) – wichtig für Fallen und Entwicklung. */
const CENTER_BONUS = 0.08
function centerBonus(board: Board, forColor: Color): number {
  let bonus = 0
  const center = [
    [3, 3], [3, 4], [4, 3], [4, 4],
    [2, 3], [2, 4], [3, 2], [3, 5], [4, 2], [4, 5], [5, 3], [5, 4],
  ]
  for (const [r, c] of center) {
    const p = getPiece(board, { r, c })
    if (!p) continue
    const w = (r >= 2 && r <= 5 && c >= 2 && c <= 5) ? CENTER_BONUS : CENTER_BONUS * 0.6
    bonus += p.color === forColor ? w : -w
  }
  return bonus
}

/** Entwicklung: Figuren aus der Grundreihe (Fallen wie Legal nutzen aktive Springer/Läufer). */
function developmentBonus(board: Board, forColor: Color): number {
  let bonus = 0
  const backRow = forColor === "w" ? 7 : 0
  const oppBack = forColor === "w" ? 0 : 7
  for (let c = 0; c < 8; c++) {
    const p = getPiece(board, { r: backRow, c })
    if (p && p.color === forColor && (p.type === "R" || p.type === "N" || p.type === "B")) bonus -= 0.05
    const q = getPiece(board, { r: oppBack, c })
    if (q && q.color !== forColor && (q.type === "R" || q.type === "N" || q.type === "B")) bonus += 0.05
  }
  return bonus
}

/** Schach-Bonus: Gegner im Schach setzen (taktisch stark). */
function checkBonus(board: Board, forColor: Color): number {
  return isInCheck(board, nextTurn(forColor)) ? 0.5 : 0
}

/** Bewertung für KI: Material + taktische Boni (Schwer nutzt Zentrum, Entwicklung, Schach). */
function evaluateBoard(board: Board, forColor: Color): number {
  let score = evaluateBoardSimple(board, forColor)
  score += centerBonus(board, forColor)
  score += developmentBonus(board, forColor)
  score += checkBonus(board, forColor)
  return score
}

/** Minimax mit Alpha-Beta für Schwer: sieht mehrere Züge voraus (Fallen wie Legal-Matt). */
function minimax(
  board: Board,
  depth: number,
  isMax: boolean,
  alpha: number,
  beta: number,
  turn: Color,
  aiColor: Color,
): number {
  const res = getGameResult(board, turn)
  if (res !== null) {
    if (res === "stalemate") return 0
    const winner = res === "checkmate" ? nextTurn(turn) : null
    return winner === aiColor ? 1000 - depth : -1000 + depth
  }
  if (depth <= 0) return evaluateBoard(board, aiColor)

  const moves = getAllMoves(board, turn)
  if (moves.length === 0) return isMax ? -1000 : 1000

  if (isMax) {
    let v = -Infinity
    for (const move of moves) {
      const { board: next } = applyMove(board, move.from, move.to, turn)
      v = Math.max(v, minimax(next, depth - 1, false, alpha, beta, nextTurn(turn), aiColor))
      alpha = Math.max(alpha, v)
      if (beta <= alpha) break
    }
    return v
  } else {
    let v = Infinity
    for (const move of moves) {
      const { board: next } = applyMove(board, move.from, move.to, turn)
      v = Math.min(v, minimax(next, depth - 1, true, alpha, beta, nextTurn(turn), aiColor))
      beta = Math.min(beta, v)
      if (beta <= alpha) break
    }
    return v
  }
}

/** KI-Zug mit Schwierigkeit: Leicht = zufällig, Mittel = 1-ply, Schwer = Minimax + taktische Bewertung */
export function getChessAIMove(
  board: Board,
  turn: Color,
  difficulty: ChessAIDifficulty
): { from: Pos; to: Pos } | null {
  const all = getAllMoves(board, turn)
  if (all.length === 0) return null

  if (difficulty === "easy") return getSimpleAIMove(board, turn)

  if (difficulty === "hard") {
    const DEPTH = 3
    const scored = all.map((move) => {
      const { board: next } = applyMove(board, move.from, move.to, turn)
      const value = minimax(next, DEPTH - 1, false, -Infinity, Infinity, nextTurn(turn), turn)
      const capture = getPiece(board, move.to)
      const captureBonus = capture ? PIECE_VALUES[capture.type] * 0.5 : 0
      return { move, value: value + captureBonus }
    })
    const bestVal = Math.max(...scored.map((s) => s.value))
    const bestMoves = scored.filter((s) => s.value === bestVal)
    return bestMoves[Math.floor(Math.random() * bestMoves.length)]?.move ?? null
  }

  // medium: 1-ply mit Bewertung
  const scored = all.map((move) => {
    const { board: next } = applyMove(board, move.from, move.to, turn)
    const score = evaluateBoard(next, turn)
    const capture = getPiece(board, move.to)
    const captureBonus = capture ? PIECE_VALUES[capture.type] * 2 : 0
    return { move, score: score + captureBonus }
  })
  scored.sort((a, b) => b.score - a.score)
  const mid = Math.max(1, Math.ceil(scored.length / 2))
  const pool = scored.slice(0, mid)
  return pool[Math.floor(Math.random() * pool.length)]?.move ?? null
}
