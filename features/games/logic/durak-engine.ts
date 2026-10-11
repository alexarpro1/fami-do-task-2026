/**
 * Podkidnoy Durak engine (2-4 players).
 * Pure functions — no React / I/O.
 * Rules: https://www.pagat.com/beating/podkidnoy_durak.html
 */

export type DurakSuit = "s" | "h" | "d" | "c"
/** 6..10, J=11, Q=12, K=13, A=14 */
export type DurakRank = 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export type DurakCard = {
  id: string
  suit: DurakSuit
  rank: DurakRank
}

export type DurakTablePair = {
  attack: DurakCard
  defense?: DurakCard
}

export type DurakPlayerCount = 2 | 3 | 4

export type DurakPhase =
  | "playing"
  | "ended"

export type DurakActionKind = "attack" | "defend" | "throw_in" | "take" | "pass"

export type DurakAction =
  | { kind: "attack"; player: number; cardId: string }
  | { kind: "defend"; player: number; cardId: string }
  | { kind: "throw_in"; player: number; cardId: string }
  | { kind: "take"; player: number }
  | { kind: "pass"; player: number }

export type DurakState = {
  playerCount: DurakPlayerCount
  hands: DurakCard[][]
  deck: DurakCard[]
  trumpSuit: DurakSuit
  /** Face-up trump under the talon (null when taken into a hand). */
  trumpCard: DurakCard | null
  discard: DurakCard[]
  table: DurakTablePair[]
  attackerIndex: number
  defenderIndex: number
  /** Players who passed (no more throw-in / attack adds) this bout. */
  passed: boolean[]
  /** Still in the game (not out). */
  inGame: boolean[]
  phase: DurakPhase
  /** Last player with cards = Durak (loser). */
  durakIndex: number | null
  /** Max attack cards this bout (set when first attack lands). */
  boutAttackLimit: number
  /** Defender already chose to take; waiting for remaining throw-ins then resolve. */
  taking: boolean
}

export const DURAK_SUITS: DurakSuit[] = ["s", "h", "d", "c"]
export const DURAK_RANKS: DurakRank[] = [6, 7, 8, 9, 10, 11, 12, 13, 14]

export function rankLabel(rank: DurakRank): string {
  if (rank === 11) return "J"
  if (rank === 12) return "Q"
  if (rank === 13) return "K"
  if (rank === 14) return "A"
  return String(rank)
}

export function suitSymbol(suit: DurakSuit): string {
  if (suit === "s") return "\u2660"
  if (suit === "h") return "\u2665"
  if (suit === "d") return "\u2666"
  return "\u2663"
}

export function createDeck(): DurakCard[] {
  const cards: DurakCard[] = []
  for (const suit of DURAK_SUITS) {
    for (const rank of DURAK_RANKS) {
      cards.push({ id: `${suit}${rank}`, suit, rank })
    }
  }
  return cards
}

/**
 * Unseeded RNG for production deals (crypto when available).
 * Tests inject a seeded `random` into createDurakGame / shuffleDeck.
 */
export function defaultDurakRandom(): number {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buf = new Uint32Array(1)
    cryptoObj.getRandomValues(buf)
    return buf[0]! / 0x100000000
  }
  return Math.random()
}

/** Fisher-Yates; inject random for tests only. */
export function shuffleDeck(deck: DurakCard[], random: () => number = defaultDurakRandom): DurakCard[] {
  const out = deck.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

function cloneCard(c: DurakCard): DurakCard {
  return { id: c.id, suit: c.suit, rank: c.rank }
}

function cloneHands(hands: DurakCard[][]): DurakCard[][] {
  return hands.map((h) => h.map(cloneCard))
}

function cloneTable(table: DurakTablePair[]): DurakTablePair[] {
  return table.map((p) => ({
    attack: cloneCard(p.attack),
    defense: p.defense ? cloneCard(p.defense) : undefined,
  }))
}

export function cloneDurakState(state: DurakState): DurakState {
  return {
    playerCount: state.playerCount,
    hands: cloneHands(state.hands),
    deck: state.deck.map(cloneCard),
    trumpSuit: state.trumpSuit,
    trumpCard: state.trumpCard ? cloneCard(state.trumpCard) : null,
    discard: state.discard.map(cloneCard),
    table: cloneTable(state.table),
    attackerIndex: state.attackerIndex,
    defenderIndex: state.defenderIndex,
    passed: state.passed.slice(),
    inGame: state.inGame.slice(),
    phase: state.phase,
    durakIndex: state.durakIndex,
    boutAttackLimit: state.boutAttackLimit,
    taking: state.taking,
  }
}

function findCard(hand: DurakCard[], cardId: string): DurakCard | null {
  return hand.find((c) => c.id === cardId) ?? null
}

function removeCard(hand: DurakCard[], cardId: string): DurakCard[] {
  return hand.filter((c) => c.id !== cardId)
}

export function beats(attack: DurakCard, defense: DurakCard, trump: DurakSuit): boolean {
  if (defense.suit === attack.suit) return defense.rank > attack.rank
  if (defense.suit === trump && attack.suit !== trump) return true
  return false
}

export function tableRanks(table: DurakTablePair[]): Set<DurakRank> {
  const ranks = new Set<DurakRank>()
  for (const pair of table) {
    ranks.add(pair.attack.rank)
    if (pair.defense) ranks.add(pair.defense.rank)
  }
  return ranks
}

function undefendedIndex(table: DurakTablePair[]): number {
  return table.findIndex((p) => !p.defense)
}

function allDefended(table: DurakTablePair[]): boolean {
  return table.length > 0 && table.every((p) => !!p.defense)
}

function nextInGame(state: DurakState, from: number, steps = 1): number {
  let idx = from
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < state.playerCount; i++) {
      idx = (idx + 1) % state.playerCount
      if (state.inGame[idx]) return idx
    }
  }
  return from
}

function countInGame(state: DurakState): number {
  return state.inGame.filter(Boolean).length
}

function lowestTrumpIndex(hands: DurakCard[][], trump: DurakSuit): number {
  let bestPlayer = 0
  let bestRank: DurakRank | null = null
  for (let p = 0; p < hands.length; p++) {
    for (const c of hands[p]!) {
      if (c.suit !== trump) continue
      if (bestRank === null || c.rank < bestRank) {
        bestRank = c.rank
        bestPlayer = p
      }
    }
  }
  return bestPlayer
}

export type CreateDurakOptions = {
  playerCount?: DurakPlayerCount
  random?: () => number
  /** Fixed deck (bottom = dealt first). Used in tests. */
  deck?: DurakCard[]
}

export function createDurakGame(options: CreateDurakOptions = {}): DurakState {
  const playerCount = options.playerCount ?? 2
  if (playerCount < 2 || playerCount > 4) {
    throw new Error("Durak supports 2-4 players")
  }
  const random = options.random ?? defaultDurakRandom
  let deck = options.deck ? options.deck.map(cloneCard) : shuffleDeck(createDeck(), random)

  const hands: DurakCard[][] = Array.from({ length: playerCount }, () => [])
  for (let round = 0; round < 6; round++) {
    for (let p = 0; p < playerCount; p++) {
      const card = deck.shift()
      if (!card) throw new Error("Deck too small")
      hands[p]!.push(card)
    }
  }

  const trumpCard = deck.length > 0 ? deck[deck.length - 1]! : hands[0]![0]!
  const trumpSuit = trumpCard.suit

  const attackerIndex = lowestTrumpIndex(hands, trumpSuit)
  const defenderIndex = (attackerIndex + 1) % playerCount

  return {
    playerCount,
    hands,
    deck,
    trumpSuit,
    trumpCard: deck.length > 0 ? cloneCard(trumpCard) : null,
    discard: [],
    table: [],
    attackerIndex,
    defenderIndex,
    passed: Array.from({ length: playerCount }, () => false),
    inGame: Array.from({ length: playerCount }, () => true),
    phase: "playing",
    durakIndex: null,
    boutAttackLimit: 6,
    taking: false,
  }
}

function attackSlotsLeft(state: DurakState): number {
  return Math.max(0, state.boutAttackLimit - state.table.length)
}

function canAddAttackCard(state: DurakState, card: DurakCard): boolean {
  if (attackSlotsLeft(state) <= 0) return false
  if (state.table.length === 0) return true
  return tableRanks(state.table).has(card.rank)
}

export function getLegalActions(state: DurakState, player: number): DurakAction[] {
  if (state.phase !== "playing") return []
  if (player < 0 || player >= state.playerCount) return []
  if (!state.inGame[player]) return []

  const actions: DurakAction[] = []
  const hand = state.hands[player]!

  // Defend / take only while an attack card is still undefended
  const undef = undefendedIndex(state.table)
  if (player === state.defenderIndex && undef >= 0 && !state.taking) {
    actions.push({ kind: "take", player })
    const attackCard = state.table[undef]!.attack
    for (const c of hand) {
      if (beats(attackCard, c, state.trumpSuit)) {
        actions.push({ kind: "defend", player, cardId: c.id })
      }
    }
    return actions
  }

  // While taking: non-defenders may still podkidnoy matching ranks, then pass / resolve
  if (state.taking) {
    if (player !== state.defenderIndex && !state.passed[player]) {
      if (canThrowIn(state, player)) {
        for (const c of hand) {
          if (canAddAttackCard(state, c)) {
            actions.push({ kind: "throw_in", player, cardId: c.id })
          }
        }
      }
      // Always allow pass so the bout can resolve (also when no legal throw-ins).
      // 2p attacker uses canThrowIn only while taking; if slots are full, tryResolveTake
      // clears the table without needing a pass.
      if (canThrowIn(state, player) || player === state.attackerIndex) {
        actions.push({ kind: "pass", player })
      }
    }
    return actions
  }

  // Attacker: lead or add matching ranks (Podkidnoy allows adds anytime during bout)
  if (player === state.attackerIndex && !state.passed[player]) {
    if (state.table.length === 0) {
      for (const c of hand) {
        actions.push({ kind: "attack", player, cardId: c.id })
      }
    } else {
      for (const c of hand) {
        if (canAddAttackCard(state, c)) {
          actions.push({ kind: "attack", player, cardId: c.id })
        }
      }
      // Pass only when table is fully defended (or taking handled above)
      if (allDefended(state.table)) {
        actions.push({ kind: "pass", player })
      }
    }
  }

  // Throw-in from other non-defender players (3-4)
  if (
    player !== state.defenderIndex &&
    player !== state.attackerIndex &&
    state.table.length > 0 &&
    !state.passed[player] &&
    canThrowIn(state, player)
  ) {
    const ranksOk = tableRanks(state.table)
    for (const c of hand) {
      if (ranksOk.has(c.rank) && canAddAttackCard(state, c)) {
        actions.push({ kind: "throw_in", player, cardId: c.id })
      }
    }
    if (allDefended(state.table) || state.taking) {
      actions.push({ kind: "pass", player })
    }
  }

  return actions
}

function canThrowIn(state: DurakState, player: number): boolean {
  if (!state.inGame[player]) return false
  if (player === state.defenderIndex) return false
  if (state.table.length === 0) return false
  if (attackSlotsLeft(state) <= 0) return false
  // 2p: attacker adds as "attack" during the bout; after defender takes, attacker
  // may still podkidnoy (throw in) matching ranks before pickup resolves.
  if (state.playerCount === 2) {
    return state.taking && player === state.attackerIndex
  }
  return true
}

function drawOne(state: DurakState): DurakCard | null {
  if (state.deck.length === 0) return null
  const card = state.deck.shift()!
  if (state.trumpCard && card.id === state.trumpCard.id) {
    state.trumpCard = null
  }
  return card
}

/** Refill order: attacker, then others clockwise except defender, then defender. */
function refillHands(state: DurakState): void {
  const order: number[] = [state.attackerIndex]
  let idx = state.attackerIndex
  for (let i = 1; i < state.playerCount; i++) {
    idx = (idx + 1) % state.playerCount
    if (idx === state.defenderIndex) continue
    order.push(idx)
  }
  order.push(state.defenderIndex)

  for (const p of order) {
    if (!state.inGame[p]) continue
    while (state.hands[p]!.length < 6) {
      const card = drawOne(state)
      if (!card) break
      state.hands[p]!.push(card)
    }
  }
}

function markOutPlayers(state: DurakState): void {
  if (state.deck.length > 0) return
  for (let p = 0; p < state.playerCount; p++) {
    if (state.inGame[p] && state.hands[p]!.length === 0) {
      state.inGame[p] = false
    }
  }
}

function checkEnd(state: DurakState): void {
  markOutPlayers(state)
  const alive = countInGame(state)
  if (alive <= 1 && state.deck.length === 0) {
    state.phase = "ended"
    const remaining = state.inGame.findIndex(Boolean)
    state.durakIndex = remaining >= 0 ? remaining : null
    // If nobody left with cards, no Durak (edge: all emptied same time) — last who had cards
    if (state.durakIndex === null) {
      // Prefer player who still has cards even if marked out incorrectly
      for (let p = 0; p < state.playerCount; p++) {
        if (state.hands[p]!.length > 0) {
          state.durakIndex = p
          break
        }
      }
    }
  }
}

function resetBoutFlags(state: DurakState): void {
  state.passed = Array.from({ length: state.playerCount }, () => false)
  state.taking = false
  state.table = []
  state.boutAttackLimit = 6
}

function startNextBout(state: DurakState, successfulDefense: boolean): void {
  refillHands(state)
  markOutPlayers(state)
  checkEnd(state)
  if (state.phase === "ended") return

  if (countInGame(state) <= 1) {
    checkEnd(state)
    return
  }

  let nextAttacker: number
  if (successfulDefense) {
    nextAttacker = state.defenderIndex
    if (!state.inGame[nextAttacker]) {
      nextAttacker = nextInGame(state, state.defenderIndex)
    }
  } else {
    // Defender took: next attacker is left of defender
    nextAttacker = nextInGame(state, state.defenderIndex)
  }

  // Skip out players
  if (!state.inGame[nextAttacker]) {
    nextAttacker = nextInGame(state, nextAttacker)
  }

  let nextDefender = nextInGame(state, nextAttacker)
  if (nextDefender === nextAttacker) {
    checkEnd(state)
    return
  }

  state.attackerIndex = nextAttacker
  state.defenderIndex = nextDefender
  resetBoutFlags(state)
}

function playerMayAddAttackCards(state: DurakState, player: number): boolean {
  if (!state.inGame[player] || player === state.defenderIndex) return false
  if (attackSlotsLeft(state) <= 0) return false
  // Taking: throw-in seats (incl. 2p attacker). Normal bout: attacker + 3+ throw-in.
  if (state.taking) {
    return canThrowIn(state, player) || player === state.attackerIndex
  }
  return player === state.attackerIndex || canThrowIn(state, player)
}

function everyoneRelevantPassed(state: DurakState): boolean {
  for (let p = 0; p < state.playerCount; p++) {
    if (!state.inGame[p]) continue
    if (p === state.defenderIndex) continue
    if (!state.passed[p]) {
      const hand = state.hands[p]!
      const canAdd =
        playerMayAddAttackCards(state, p) && hand.some((c) => canAddAttackCard(state, c))
      if (canAdd) return false
      // Auto-pass players who cannot add
      state.passed[p] = true
    }
  }
  return true
}

function tryResolveSuccessfulBout(state: DurakState): boolean {
  if (state.taking) return false
  if (state.table.length === 0) return false
  if (!allDefended(state.table)) return false
  if (!everyoneRelevantPassed(state)) return false

  for (const pair of state.table) {
    state.discard.push(pair.attack)
    if (pair.defense) state.discard.push(pair.defense)
  }
  startNextBout(state, true)
  return true
}

function resolveTake(state: DurakState): void {
  const defender = state.defenderIndex
  for (const pair of state.table) {
    state.hands[defender]!.push(cloneCard(pair.attack))
    if (pair.defense) state.hands[defender]!.push(cloneCard(pair.defense))
  }
  startNextBout(state, false)
}

function tryResolveTake(state: DurakState): boolean {
  if (!state.taking) return false
  // After take declared: others may throw in until pass/limit, then defender picks up
  if (!everyoneRelevantPassed(state) && attackSlotsLeft(state) > 0) {
    return false
  }
  resolveTake(state)
  return true
}

export type ApplyDurakResult =
  | { ok: true; state: DurakState }
  | { ok: false; reason: string; state: DurakState }

export function applyDurakAction(state: DurakState, action: DurakAction): ApplyDurakResult {
  const next = cloneDurakState(state)
  if (next.phase !== "playing") {
    return { ok: false, reason: "game_ended", state }
  }

  const legal = getLegalActions(next, action.player)
  const matches = legal.some((a) => {
    if (a.kind !== action.kind || a.player !== action.player) return false
    if (a.kind === "attack" || a.kind === "defend" || a.kind === "throw_in") {
      return action.kind === a.kind && "cardId" in action && a.cardId === action.cardId
    }
    return true
  })
  if (!matches) {
    return { ok: false, reason: "illegal_action", state }
  }

  if (action.kind === "attack") {
    const card = findCard(next.hands[action.player]!, action.cardId)
    if (!card) return { ok: false, reason: "card_missing", state }
    if (next.table.length === 0) {
      // Cap = min(6, defender cards)
      next.boutAttackLimit = Math.min(6, Math.max(1, next.hands[next.defenderIndex]!.length))
    }
    next.hands[action.player] = removeCard(next.hands[action.player]!, action.cardId)
    next.table.push({ attack: cloneCard(card) })
    // New undefended card: clear passes so others may throw again after defense
    next.passed = Array.from({ length: next.playerCount }, () => false)
    return { ok: true, state: next }
  }

  if (action.kind === "throw_in") {
    const card = findCard(next.hands[action.player]!, action.cardId)
    if (!card) return { ok: false, reason: "card_missing", state }
    next.hands[action.player] = removeCard(next.hands[action.player]!, action.cardId)
    next.table.push({ attack: cloneCard(card) })
    if (!next.taking) {
      next.passed = Array.from({ length: next.playerCount }, () => false)
    }
    tryResolveTake(next)
    return { ok: true, state: next }
  }

  if (action.kind === "defend") {
    const undef = undefendedIndex(next.table)
    if (undef < 0) return { ok: false, reason: "nothing_to_defend", state }
    const card = findCard(next.hands[action.player]!, action.cardId)
    if (!card) return { ok: false, reason: "card_missing", state }
    const attackCard = next.table[undef]!.attack
    if (!beats(attackCard, card, next.trumpSuit)) {
      return { ok: false, reason: "does_not_beat", state }
    }
    next.hands[action.player] = removeCard(next.hands[action.player]!, action.cardId)
    next.table[undef] = { attack: next.table[undef]!.attack, defense: cloneCard(card) }
    // After full defense, attackers may add again — reset their pass flags
    if (allDefended(next.table)) {
      next.passed = Array.from({ length: next.playerCount }, () => false)
      tryResolveSuccessfulBout(next)
    }
    return { ok: true, state: next }
  }

  if (action.kind === "take") {
    next.taking = true
    // Attacker/others may still throw in; then resolve
    next.passed = Array.from({ length: next.playerCount }, () => false)
    next.passed[next.defenderIndex] = true
    tryResolveTake(next)
    return { ok: true, state: next }
  }

  if (action.kind === "pass") {
    next.passed[action.player] = true
    if (next.taking) {
      tryResolveTake(next)
    } else {
      tryResolveSuccessfulBout(next)
    }
    return { ok: true, state: next }
  }

  return { ok: false, reason: "unknown_action", state }
}

/** Public view: hide other hands (card backs + counts). */
export type DurakPublicHand = {
  count: number
  cards?: DurakCard[]
}

export type DurakPublicState = Omit<DurakState, "hands"> & {
  hands: DurakPublicHand[]
}

export function toPublicDurakState(state: DurakState, viewerSeat: number): DurakPublicState {
  return {
    ...cloneDurakState(state),
    hands: state.hands.map((hand, i) =>
      i === viewerSeat
        ? { count: hand.length, cards: hand.map(cloneCard) }
        : { count: hand.length },
    ),
  }
}

export function isPlayersTurnToAct(state: DurakState, player: number): boolean {
  return getLegalActions(state, player).length > 0
}

export function winners(state: DurakState): number[] {
  if (state.phase !== "ended") return []
  const out: number[] = []
  for (let p = 0; p < state.playerCount; p++) {
    if (p !== state.durakIndex) out.push(p)
  }
  return out
}
