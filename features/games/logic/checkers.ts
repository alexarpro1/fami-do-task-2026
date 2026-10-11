/**
 * Dame (Checkers) – 8×8, nur dunkle Felder.
 * Schwarz oben (Züge nach unten), Weiß unten (Züge nach oben).
 * Schlagen optional Mehrfach-Sprung; bei möglichem Schlag nur Schlagzüge erlaubt.
 */

export type Color = "w" | "b"

export interface Piece {
  color: Color
  king: boolean
}

export type Square = Piece | null
export type Board = Square[][]

export interface Pos {
  r: number
  c: number
}

export type GameResult = "w" | "b" | "draw" | null

const ROWS = 8
const COLS = 8

function isDark(r: number, c: number): boolean {
  return (r + c) % 2 === 1
}

export function createInitialBoard(): Board {
  const board: Board = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(null))

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isDark(r, c)) continue
      if (r <= 2) board[r][c] = { color: "b", king: false }
      if (r >= 5) board[r][c] = { color: "w", king: false }
    }
  }
  return board
}

export function inBounds(pos: Pos): boolean {
  return pos.r >= 0 && pos.r < ROWS && pos.c >= 0 && pos.c < COLS
}

export function getPiece(board: Board, pos: Pos): Square {
  return inBounds(pos) ? board[pos.r][pos.c] : null
}

function copyBoard(board: Board): Board {
  return board.map((row) => row.map((s) => (s ? { ...s } : null)))
}

/** Richtung für normale Steine: Schwarz (oben) bewegt sich nach unten (r+1), Weiß nach oben (r-1). */
const FORWARD_DR: Record<Color, number> = { b: 1, w: -1 }

/** Alle möglichen Züge von einer Position (inkl. Mehrfach-Schlag). */
export interface Move {
  from: Pos
  to: Pos
  captures: Pos[] // übersprungene Felder
}

/** Einzelne Schlagzüge (ein Sprung). Nach internationalen Regeln dürfen einfache Steine auch rückwärts schlagen. */
function getSingleCaptureMoves(board: Board, pos: Pos, turn: Color, piece: Piece): Move[] {
  const moves: Move[] = []
  const dirs = piece.king ? [1, -1] : [1, -1] // Einfache Steine: vorwärts und rückwärts schlagen

  for (const dr of dirs) {
    for (const dc of [-1, 1]) {
      const mid = { r: pos.r + dr, c: pos.c + dc }
      const to = { r: pos.r + 2 * dr, c: pos.c + 2 * dc }
      if (!inBounds(mid) || !inBounds(to)) continue
      const midPiece = getPiece(board, mid)
      const toPiece = getPiece(board, to)
      if (midPiece && midPiece.color !== turn && !toPiece && isDark(to.r, to.c)) {
        moves.push({ from: { ...pos }, to: { ...to }, captures: [{ ...mid }] })
      }
    }
  }
  return moves
}

/** Brett nach einem Zug (ohne Förderung zu prüfen), für Rekursion. */
function boardAfterMove(board: Board, move: Move, turn: Color): Board {
  const next = copyBoard(board)
  const piece = next[move.from.r][move.from.c]!
  next[move.from.r][move.from.c] = null
  for (const cap of move.captures) next[cap.r][cap.c] = null
  const promoted = { ...piece }
  if (!piece.king && turn === "b" && move.to.r === ROWS - 1) promoted.king = true
  if (!piece.king && turn === "w" && move.to.r === 0) promoted.king = true
  next[move.to.r][move.to.c] = promoted
  return next
}

/** Alle Mehrfach-Schlag-Ketten von einer Position (rekursiv). Klassische Regel: gleicher Stein darf weiter springen. */
function getCaptureChains(board: Board, pos: Pos, turn: Color, piece: Piece): Move[] {
  const singleJumps = getSingleCaptureMoves(board, pos, turn, piece)
  if (singleJumps.length === 0) return []

  const chains: Move[] = []
  for (const jump of singleJumps) {
    const newBoard = boardAfterMove(board, jump, turn)
    const pieceAtTo = getPiece(newBoard, jump.to)!
    const continued = getCaptureChains(newBoard, jump.to, turn, pieceAtTo)
    if (continued.length === 0) {
      chains.push(jump)
    } else {
      for (const cont of continued) {
        chains.push({
          from: { ...pos },
          to: { ...cont.to },
          captures: [...jump.captures, ...cont.captures],
        })
      }
    }
  }
  return chains
}

/** Prüft, ob die Farbe irgendwo einen Schlag (einzel oder Kette) machen kann. */
function hasAnyCapture(board: Board, turn: Color): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const pos = { r, c }
      const piece = getPiece(board, pos)
      if (piece && piece.color === turn && getCaptureChains(board, pos, turn, piece).length > 0) return true
    }
  }
  return false
}

/** Maximale Schlaganzahl in einem Zug für die Farbe (Mehrheitsschlag). */
function maxCaptureCount(board: Board, turn: Color): number {
  let max = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const pos = { r, c }
      const piece = getPiece(board, pos)
      if (!piece || piece.color !== turn) continue
      const chains = getCaptureChains(board, pos, turn, piece)
      for (const m of chains) if (m.captures.length > max) max = m.captures.length
    }
  }
  return max
}

/** Einfache Züge (ohne Schlag): ein Feld diagonal vorwärts (bzw. beide Richtungen bei Dame). */
function getSimpleMoves(board: Board, pos: Pos, turn: Color, piece: Piece): Pos[] {
  const targets: Pos[] = []
  const dirs = piece.king ? [1, -1] : [FORWARD_DR[turn]]

  for (const dr of dirs) {
    for (const dc of [-1, 1]) {
      const to = { r: pos.r + dr, c: pos.c + dc }
      if (inBounds(to) && !getPiece(board, to) && isDark(to.r, to.c)) targets.push(to)
    }
  }
  return targets
}

/** Alle erlaubten Züge für ein Feld. Bei Schlagpflicht nur Schlagzüge mit maximaler Schlaganzahl (Mehrheitsschlag). */
export function getMoves(board: Board, pos: Pos, turn: Color): Move[] {
  const piece = getPiece(board, pos)
  if (!piece || piece.color !== turn) return []

  const mustCapture = hasAnyCapture(board, turn)
  if (mustCapture) {
    const chains = getCaptureChains(board, pos, turn, piece)
    if (chains.length === 0) return []
    const maxCap = maxCaptureCount(board, turn)
    return chains.filter((m) => m.captures.length === maxCap)
  }

  const simple = getSimpleMoves(board, pos, turn, piece)
  return simple.map((to) => ({ from: pos, to, captures: [] }))
}

/** Führt einen Zug aus; gibt neues Brett und ggf. geschlagene Steine zurück. Nach dem Zug: Förderung zur Dame prüfen. */
export function applyMove(board: Board, move: Move, turn: Color): { board: Board; capturedCount: number } {
  const next = copyBoard(board)
  const piece = next[move.from.r][move.from.c]!
  next[move.from.r][move.from.c] = null
  for (const cap of move.captures) {
    next[cap.r][cap.c] = null
  }
  next[move.to.r][move.to.c] = { ...piece }

  // Förderung zur Dame
  if (!piece.king) {
    if (turn === "b" && move.to.r === ROWS - 1) next[move.to.r][move.to.c]!.king = true
    if (turn === "w" && move.to.r === 0) next[move.to.r][move.to.c]!.king = true
  }

  return { board: next, capturedCount: move.captures.length }
}

/** Nächster Spieler. */
export function nextTurn(turn: Color): Color {
  return turn === "w" ? "b" : "w"
}

/** Hat die Farbe noch gültige Züge? */
function hasMoves(board: Board, turn: Color): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const pos = { r, c }
      const moves = getMoves(board, pos, turn)
      if (moves.length > 0) return true
    }
  }
  return false
}

/** Anzahl der Steine einer Farbe. */
function countPieces(board: Board, color: Color): number {
  let n = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = getPiece(board, { r, c })
      if (p && p.color === color) n++
    }
  }
  return n
}

/** Spielende: Sieg für eine Farbe oder Unentschieden. */
export function getGameResult(board: Board, turn: Color): GameResult {
  const wCount = countPieces(board, "w")
  const bCount = countPieces(board, "b")
  if (wCount === 0) return "b"
  if (bCount === 0) return "w"
  const currentHasMoves = hasMoves(board, turn)
  const other = nextTurn(turn)
  const otherHasMoves = hasMoves(board, other)
  if (!currentHasMoves && !otherHasMoves) return "draw"
  if (!currentHasMoves) return other
  if (!otherHasMoves) return turn
  return null
}

/** Alle gültigen Züge einer Farbe (für KI). */
export function getAllMoves(board: Board, turn: Color): Move[] {
  const moves: Move[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      moves.push(...getMoves(board, { r, c }, turn))
    }
  }
  return moves
}

export type DameAIDifficulty = "easy" | "medium" | "hard"

/** Level-/Tier-Skalierung (Phase D) für getDameAIMove. */
export type DameAIStrength = {
  hardDepthEarly?: number
  hardDepthLate?: number
  /** 0…1: medium = Zufallszug; hard = zweitbester Zug. */
  blunderRate?: number
}

/** Bewertung einer Stellung (für KI): positiv = gut für turn. Basis: Material + Dame. */
function evaluateBoardBase(board: Board, turn: Color): number {
  let score = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = getPiece(board, { r, c })
      if (!p) continue
      const value = p.king ? 3 : 1
      const backRowBonus = p.color === "b" && r === ROWS - 1 ? 0.2 : p.color === "w" && r === 0 ? 0.2 : 0
      if (p.color === turn) score += value + backRowBonus
      else score -= value + backRowBonus
    }
  }
  return score
}

/** Zählt, wie viele gegnerische Steine von turn aus in einem Zug geschlagen werden können (2-für-1-Zielscheibe). */
function countCapturablePieces(board: Board, turn: Color): number {
  const opponent = turn === "w" ? "b" : "w"
  let count = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const mid = { r, c }
      const p = getPiece(board, mid)
      if (!p || p.color !== opponent || !isDark(r, c)) continue
      for (const dr of [1, -1]) {
        for (const dc of [-1, 1]) {
          const from = { r: r + dr, c: c + dc }
          const to = { r: r - dr, c: c - dc }
          if (!inBounds(from) || !inBounds(to)) continue
          const ourPiece = getPiece(board, from)
          if (!ourPiece || ourPiece.color !== turn) continue
          if (getPiece(board, to)) continue
          if (!isDark(to.r, to.c)) continue
          count++
          break
        }
      }
    }
  }
  return count
}

/** Gegnerische Steine am Rand (weniger Fluchtmöglichkeiten = Einmauern). */
function countOpponentOnEdge(board: Board, turn: Color): number {
  const opponent = turn === "w" ? "b" : "w"
  let count = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isDark(r, c)) continue
      const p = getPiece(board, { r, c })
      if (!p || p.color !== opponent) continue
      if (c === 0 || c === COLS - 1 || r === 0 || r === ROWS - 1) count++
    }
  }
  return count
}

/** Fortschritt zur Grundlinie (Kronen-Falle: Weg zur Dame). */
function advancementBonus(board: Board, turn: Color): number {
  let bonus = 0
  const targetRow = turn === "w" ? 0 : ROWS - 1
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = getPiece(board, { r, c })
      if (!p || p.color !== turn || p.king) continue
      const dist = Math.abs(r - targetRow)
      bonus += (ROWS - dist) * 0.05
    }
  }
  return bonus
}

/** Bewertung einer Stellung (für KI): positiv = gut für turn. Schwer nutzt Taktik-Boni. */
export function evaluateBoard(board: Board, turn: Color): number {
  let score = evaluateBoardBase(board, turn)
  const capturable = countCapturablePieces(board, turn)
  const onEdge = countOpponentOnEdge(board, turn)
  const advance = advancementBonus(board, turn)
  score += capturable * 0.8
  score += onEdge * 0.15
  score += advance
  return score
}

/** KI: Leicht = zufälliger Zug, Mittel = priorisiert Schläge/Grundlinie, Schwer = Minimax + Alpha-Beta. */
export function getDameAIMove(
  board: Board,
  turn: Color,
  difficulty: DameAIDifficulty,
  strength?: DameAIStrength,
): Move | null {
  const moves = getAllMoves(board, turn)
  if (moves.length === 0) return null
  const blunderRate = Math.max(0, Math.min(1, strength?.blunderRate ?? 0))

  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  if (difficulty === "medium") {
    if (blunderRate > 0 && Math.random() < blunderRate) {
      return moves[Math.floor(Math.random() * moves.length)]
    }
    const captureMoves = moves.filter((m) => m.captures.length > 0)
    const candidates = captureMoves.length > 0 ? captureMoves : moves
    const scores = candidates.map((move) => {
      const { board: next } = applyMove(board, move, turn)
      let s = evaluateBoard(next, turn)
      if (move.captures.length > 0) s += 2
      const piece = getPiece(board, move.from)
      const toBackRow = turn === "b" ? move.to.r === ROWS - 1 : move.to.r === 0
      if (piece && !piece.king && toBackRow) s += 1
      return s
    })
    const best = Math.max(...scores)
    const bestMoves = candidates.filter((_, i) => scores[i] === best)
    return bestMoves[Math.floor(Math.random() * bestMoves.length)]
  }

  // Schwer: Minimax mit Alpha-Beta.
  // Dynamische Suchtiefe: im frühen Spiel flacher, später tiefer; Tier skaliert DEPTH.
  const early = strength?.hardDepthEarly ?? 4
  const late = strength?.hardDepthLate ?? 6
  const DEPTH = moves.length > 16 ? Math.max(2, early) : Math.max(3, late)

  function minimax(
    b: Board,
    depth: number,
    isMax: boolean,
    alpha: number,
    beta: number,
    currentTurn: Color,
  ): number {
    const res = getGameResult(b, currentTurn)
    if (res !== null) {
      if (res === "draw") return 0
      return res === turn ? 1000 - depth : -1000 + depth
    }
    if (depth >= DEPTH) return evaluateBoard(b, turn)

    const ms = getAllMoves(b, currentTurn)
    if (ms.length === 0) return isMax ? -1000 : 1000

    // Reihenfolge: Zuerst Züge mit vielen Schlägen prüfen – verbessert Alpha-Beta-Pruning.
    const ordered = [...ms].sort((a, b) => b.captures.length - a.captures.length)

    if (isMax) {
      let v = -Infinity
      for (const move of ordered) {
        const { board: next } = applyMove(b, move, currentTurn)
        const childVal = minimax(next, depth + 1, false, alpha, beta, nextTurn(currentTurn))
        v = Math.max(v, childVal)
        alpha = Math.max(alpha, v)
        if (beta <= alpha) break
      }
      return v
    } else {
      let v = Infinity
      for (const move of ordered) {
        const { board: next } = applyMove(b, move, currentTurn)
        const childVal = minimax(next, depth + 1, true, alpha, beta, nextTurn(currentTurn))
        v = Math.min(v, childVal)
        beta = Math.min(beta, v)
        if (beta <= alpha) break
      }
      return v
    }
  }

  // Reihenfolge auf Top-Ebene ebenfalls nach Schlaganzahl sortieren.
  const orderedRootMoves = [...moves].sort((a, b) => b.captures.length - a.captures.length)

  const movesWithEval = orderedRootMoves.map((move) => {
    const { board: next } = applyMove(board, move, turn)
    const value = minimax(next, 1, false, -Infinity, Infinity, nextTurn(turn))
    return { move, value }
  })
  movesWithEval.sort((a, b) => b.value - a.value)
  const bestVal = movesWithEval[0]?.value ?? -Infinity
  const bestMoves = movesWithEval.filter((m) => m.value === bestVal)
  let pick = bestMoves[Math.floor(Math.random() * bestMoves.length)].move
  if (blunderRate > 0 && movesWithEval.length > 1 && Math.random() < blunderRate) {
    pick = movesWithEval[1].move
  }
  return pick
}

