export const MAX_GAME_LEVEL = 50

export const BONUS_LEVELS = [10, 20, 30, 40, 50] as const
export type BonusLevel = (typeof BONUS_LEVELS)[number]

export type GameIdForProgress = "reaction" | "memory" | "tap" | "color" | "chess" | "dame" | "math" | "word" | "mole"

export type GameProgress = {
  xp: number
  level: number
  bonusClaimedLevels?: number[]
}

export const GAME_LEVEL_BONUSES: Record<GameIdForProgress, Partial<Record<BonusLevel, number>>> = {
  reaction: { 10: 10, 20: 15, 30: 20, 40: 25, 50: 30 },
  memory: { 10: 10, 20: 15, 30: 20, 40: 25, 50: 30 },
  tap: { 10: 10, 20: 15, 30: 20, 40: 25, 50: 30 },
  color: { 10: 10, 20: 15, 30: 20, 40: 25, 50: 30 },
  chess: { 10: 15, 20: 20, 30: 25, 40: 30, 50: 35 },
  dame: { 10: 15, 20: 20, 30: 25, 40: 30, 50: 35 },
  math: { 10: 10, 20: 15, 30: 20, 40: 25, 50: 30 },
  word: { 10: 10, 20: 15, 30: 20, 40: 25, 50: 30 },
  mole: { 10: 10, 20: 15, 30: 20, 40: 25, 50: 30 },
}

export function computeLevelFromXp(xp: number, xpPerLevel: number, maxLevel: number = MAX_GAME_LEVEL): number {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0
  const safePerLevel = xpPerLevel > 0 ? xpPerLevel : 100
  const rawLevel = Math.floor(safeXp / safePerLevel) + 1
  const unclamped = Math.max(1, rawLevel)
  return Math.min(maxLevel, unclamped)
}

export function applyXpAndGetBonuses(
  gameId: GameIdForProgress,
  progress: GameProgress,
  addedXp: number,
  xpPerLevel: number,
  maxLevel: number = MAX_GAME_LEVEL,
): {
  xp: number
  level: number
  bonusClaimedLevels: number[]
  bonusCoins: number
  newBonusLevels: BonusLevel[]
} {
  const prevXp = Number.isFinite(progress.xp) ? progress.xp : 0
  const safeAdded = addedXp > 0 ? addedXp : 0
  const prevLevel = computeLevelFromXp(prevXp, xpPerLevel, maxLevel)
  const nextXp = prevXp + safeAdded
  const nextLevel = computeLevelFromXp(nextXp, xpPerLevel, maxLevel)

  const claimed = Array.isArray(progress.bonusClaimedLevels)
    ? progress.bonusClaimedLevels.filter((n) => Number.isFinite(n))
    : []

  const newlyReachedLevels = BONUS_LEVELS.filter((lvl) => prevLevel < lvl && nextLevel >= lvl && !claimed.includes(lvl))

  const bonusTable = GAME_LEVEL_BONUSES[gameId] ?? {}
  const bonusCoins = newlyReachedLevels.reduce((sum, lvl) => {
    const amount = bonusTable[lvl] ?? 0
    return sum + (amount > 0 ? amount : 0)
  }, 0)

  const bonusClaimedLevels = [...claimed, ...newlyReachedLevels]

  return {
    xp: nextXp,
    level: nextLevel,
    bonusClaimedLevels,
    bonusCoins,
    newBonusLevels: newlyReachedLevels,
  }
}

export function getLevelProgress(
  xp: number,
  xpPerLevel: number,
  maxLevel: number = MAX_GAME_LEVEL,
): {
  level: number
  xpInCurrentLevel: number
  xpForNextLevel: number
  nextLevel: number | null
} {
  const level = computeLevelFromXp(xp, xpPerLevel, maxLevel)
  const safePerLevel = xpPerLevel > 0 ? xpPerLevel : 100

  const baseXpForLevel = (level - 1) * safePerLevel
  const xpInCurrentLevel = Math.max(0, xp - baseXpForLevel)

  if (level >= maxLevel) {
    return {
      level,
      xpInCurrentLevel,
      xpForNextLevel: 0,
      nextLevel: null,
    }
  }

  return {
    level,
    xpInCurrentLevel,
    xpForNextLevel: safePerLevel,
    nextLevel: level + 1,
  }
}

export function getNextBonusLevel(
  gameId: GameIdForProgress,
  currentLevel: number,
  maxLevel: number = MAX_GAME_LEVEL,
): BonusLevel | null {
  const bonusTable = GAME_LEVEL_BONUSES[gameId]
  if (!bonusTable) return null
  const clampedLevel = Math.max(1, Math.min(maxLevel, currentLevel))
  const upcoming = BONUS_LEVELS.filter((lvl) => lvl > clampedLevel && lvl <= maxLevel && (bonusTable[lvl] ?? 0) > 0)
  return upcoming.length > 0 ? upcoming[0] : null
}

