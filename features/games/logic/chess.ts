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

const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [2, 1],
  [2, -1],
  [-2, 1],
  [-2, -1],
  [1, 2],
  [1, -2],
  [-1, 2],
  [-1, -2],
]

const KING_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

const BISHOP_RAYS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

const ROOK_RAYS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function opponent(color: Color): Color {
  return color === "w" ? "b" : "w"
}

function rayHits(board: Board, pos: Pos, byColor: Color, rays: ReadonlyArray<readonly [number, number]>, slider: "B" | "R"): boolean {
  for (let i = 0; i < rays.length; i++) {
    const dr = rays[i][0]
    const dc = rays[i][1]
    let r = pos.r + dr
    let c = pos.c + dc
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const piece = board[r][c]
      if (piece) {
        if (piece.color === byColor && (piece.type === slider || piece.type === "Q")) return true
        break
      }
      r += dr
      c += dc
    }
  }
  return false
}

/**
 * Echte Angriffe: Bauern nur diagonal nach vorn, nicht das Feld direkt davor.
 * Leere Diagonalen zählen mit – ein König darf dort nicht hin.
 */
export function isSquareAttacked(board: Board, pos: Pos, byColor: Color): boolean {
  const pawnRow = pos.r + (byColor === "w" ? 1 : -1)
  if (pawnRow >= 0 && pawnRow < 8) {
    for (const dc of [-1, 1]) {
      const c = pos.c + dc
      if (c < 0 || c > 7) continue
      const piece = board[pawnRow][c]
      if (piece?.color === byColor && piece.type === "P") return true
    }
  }

  for (let i = 0; i < KNIGHT_DELTAS.length; i++) {
    const r = pos.r + KNIGHT_DELTAS[i][0]
    const c = pos.c + KNIGHT_DELTAS[i][1]
    if (r < 0 || r > 7 || c < 0 || c > 7) continue
    const piece = board[r][c]
    if (piece?.color === byColor && piece.type === "N") return true
  }

  for (let i = 0; i < KING_DELTAS.length; i++) {
    const r = pos.r + KING_DELTAS[i][0]
    const c = pos.c + KING_DELTAS[i][1]
    if (r < 0 || r > 7 || c < 0 || c > 7) continue
    const piece = board[r][c]
    if (piece?.color === byColor && piece.type === "K") return true
  }

  if (rayHits(board, pos, byColor, BISHOP_RAYS, "B")) return true
  return rayHits(board, pos, byColor, ROOK_RAYS, "R")
}

function wouldLeaveKingInCheck(board: Board, from: Pos, to: Pos, turn: Color): boolean {
  const moved = board[from.r][from.c]
  if (!moved) return false
  const captured = board[to.r][to.c]
  const promote = moved.type === "P" && (to.r === 0 || to.r === 7)
  board[to.r][to.c] = promote ? { color: moved.color, type: "Q" } : moved
  board[from.r][from.c] = null
  try {
    const kingPos = findKing(board, turn)
    return kingPos ? isSquareAttacked(board, kingPos, opponent(turn)) : false
  } finally {
    board[from.r][from.c] = moved
    board[to.r][to.c] = captured
  }
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
  turn: Color,
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

