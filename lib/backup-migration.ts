import type { FamilyState, Child, Task, Reward, Rule, TaskCategory, TaskDifficulty } from "@/types"
import { DEFAULT_SETTINGS, generateId } from "@/lib/constants"

/** Phase 15.5: Normalisierung für Backup-Import – fehlende Felder (alte Backup-Versionen) werden mit 0/Default belegt, kein Fehler. */

function normalizeChildFromBackup(raw: any, index: number): Child {
  const now = new Date().toISOString()
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    name: typeof raw?.name === "string" ? raw.name : `Kind ${index + 1}`,
    age: typeof raw?.age === "number" ? raw.age : 0,
    avatar: typeof raw?.avatar === "string" ? raw.avatar : "👤",
    color: typeof raw?.color === "string" ? raw.color : "#94a3b8",
    points: typeof raw?.points === "number" ? raw.points : 0,
    totalPointsEarned: typeof raw?.totalPointsEarned === "number" ? raw.totalPointsEarned : 0,
    createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : now,
    level: raw?.level,
    wishlistRewardIds: Array.isArray(raw?.wishlistRewardIds) ? raw.wishlistRewardIds : undefined,
    currentStreak: raw?.currentStreak,
    longestStreak: raw?.longestStreak,
    lastActiveDate: raw?.lastActiveDate,
    achievements: Array.isArray(raw?.achievements) ? raw.achievements : undefined,
    gameGoldCoins: typeof raw?.gameGoldCoins === "number" ? raw.gameGoldCoins : undefined,
  }
}

function normalizeTaskFromBackup(raw: any, index: number): Task {
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    title: typeof raw?.title === "string" ? raw.title : "Aufgabe",
    description: raw?.description,
    note: raw?.note,
    points: typeof raw?.points === "number" ? raw.points : 5,
    category: normalizeTaskCategory(raw?.category),
    difficulty: normalizeDifficulty(raw?.difficulty),
    emoji: typeof raw?.emoji === "string" ? raw.emoji : "⭐",
    duration: typeof raw?.duration === "number" ? raw.duration : undefined,
    days: convertDays(raw?.days),
    isActive: raw?.isActive !== false,
    order: typeof raw?.order === "number" ? raw.order : index,
    dailyLimit: raw?.dailyLimit,
    usageCount: raw?.usageCount,
    startTime: raw?.startTime,
    endTime: raw?.endTime,
    repeatInterval: raw?.repeatInterval,
    timerOptions:
      raw?.timerOptions && typeof raw.timerOptions === "object"
        ? {
            showMiniTimer: raw.timerOptions.showMiniTimer !== false,
            showVisualTimer: raw.timerOptions.showVisualTimer !== false,
            showFocusTimer: raw.timerOptions.showFocusTimer !== false,
          }
        : { showMiniTimer: true, showVisualTimer: true, showFocusTimer: true },
  }
}

function normalizeRewardFromBackup(raw: any): Reward {
  const category = raw?.category
  const validCategory = ["experience", "privilege", "item", "special"].includes(category) ? category : "item"
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    name: typeof raw?.name === "string" ? raw.name : "Belohnung",
    description: raw?.description,
    cost: typeof raw?.cost === "number" ? raw.cost : 0,
    emoji: typeof raw?.emoji === "string" ? raw.emoji : "🎁",
    category: validCategory,
    isActive: raw?.isActive !== false,
    stock: raw?.stock,
    dailyLimit: raw?.dailyLimit,
    repeatInterval: raw?.repeatInterval,
    purchaseCount: raw?.purchaseCount,
  }
}

function normalizeRuleFromBackup(raw: any, index: number): Rule {
  const points = typeof raw?.points === "number" ? raw.points : 0
  const category = raw?.category
  const validCategory = ["behavior", "homework", "chores", "social", "custom"].includes(category) ? category : "behavior"
  return {
    id: typeof raw?.id === "string" ? raw.id : generateId(),
    title: typeof raw?.title === "string" ? raw.title : "Regel",
    description: raw?.description,
    points,
    isPositive: raw?.isPositive !== undefined ? !!raw.isPositive : points >= 0,
    emoji: typeof raw?.emoji === "string" ? raw.emoji : "⚖️",
    category: validCategory,
    dailyLimit: raw?.dailyLimit,
    repeatInterval: raw?.repeatInterval,
    isActive: raw?.isActive !== false,
    order: typeof raw?.order === "number" ? raw.order : index,
    usageCount: raw?.usageCount,
  }
}

// Legacy Backup Format (old app structure)
interface LegacyUser {
  id: string
  name: string
  avatar: string
  score: number
  unlockedStickers?: string[]
  history?: Array<{
    date: string
    reason: string
    points: number
  }>
}

interface LegacyTask {
  id?: string
  title?: string
  name?: string
  description?: string
  note?: string
  emoji?: string
  icon?: string
  category?: string
  points?: number
  duration?: number
  days?: number[] | string[] // Can be [0,1,2,3,4,5,6] or ["mon","tue",...]
  isActive?: boolean
  order?: number
  difficulty?: string
  dailyLimit?: number
  startTime?: string
  endTime?: string
}

interface LegacyReward {
  id?: string
  title?: string
  name?: string
  description?: string
  emoji?: string
  icon?: string
  cost?: number
  points?: number
  category?: string
  isActive?: boolean
  stock?: number
  dailyLimit?: number
}

interface LegacyRule {
  id?: string
  title?: string
  name?: string
  description?: string
  emoji?: string
  icon?: string
  points?: number
  isPositive?: boolean
  category?: string
  isActive?: boolean
  dailyLimit?: number
}

interface LegacyBackup {
  users?: LegacyUser[]
  tasks?: LegacyTask[]
  rewards?: LegacyReward[]
  rules?: LegacyRule[]
}

export type MergeOption = "keep-current" | "use-backup" | "merge-both"

export interface ImportOptions {
  mergeChildren: MergeOption
  mergeTasks: MergeOption
  mergeRewards: MergeOption
  mergeRules: MergeOption
  mergePets?: MergeOption
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  mergeChildren: "use-backup",
  mergeTasks: "use-backup",
  mergeRewards: "use-backup",
  mergeRules: "use-backup",
  mergePets: "use-backup",
}

// Validation Results
interface ValidationResult {
  isValid: boolean
  format: "new" | "legacy" | "unknown"
  errors: string[]
  warnings: string[]
  hasChildren: boolean
  hasTasks: boolean
  hasRewards: boolean
  hasRules: boolean
  childrenCount: number
  tasksCount: number
  rewardsCount: number
  rulesCount: number
}

function convertDays(days: number[] | string[] | undefined): string[] {
  if (!days || days.length === 0) {
    return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  }

  const dayMap: Record<number, string> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  }

  return days.map((d) => {
    if (typeof d === "string") {
      // Already a string, normalize it
      const lower = d.toLowerCase()
      if (["sun", "mon", "tue", "wed", "thu", "fri", "sat"].includes(lower)) {
        return lower
      }
      // Try to parse as number
      const num = Number.parseInt(d)
      if (!isNaN(num) && dayMap[num]) {
        return dayMap[num]
      }
      return "mon" // fallback
    }
    if (typeof d === "number" && dayMap[d]) {
      return dayMap[d]
    }
    return "mon" // fallback
  })
}

function normalizeTaskCategory(cat: string | undefined): TaskCategory {
  if (!cat) return "custom"
  const lower = cat.toLowerCase()
  if (["morning", "evening", "weekend", "custom"].includes(lower)) {
    return lower as TaskCategory
  }
  if (lower === "daily" || lower === "routine") return "morning"
  if (lower === "school" || lower === "homework") return "morning"
  return "custom"
}

function normalizeDifficulty(diff: string | undefined): TaskDifficulty {
  if (!diff) return "easy"
  const lower = diff.toLowerCase()
  if (["easy", "medium", "hard"].includes(lower)) {
    return lower as TaskDifficulty
  }
  return "easy"
}

// Validate backup structure
export function validateBackup(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let hasChildren = false
  let hasTasks = false
  let hasRewards = false
  let hasRules = false
  let childrenCount = 0
  let tasksCount = 0
  let rewardsCount = 0
  let rulesCount = 0

  // Check if it's a new format backup
  if (data.type && (data.type === "settings" || data.type === "data" || data.type === "all")) {
    if (!data.version || !data.exportedAt) {
      warnings.push("Neues Backup-Format fehlt Version oder Zeitstempel")
    }

    if (data.type === "data" || data.type === "all") {
      const source = data.type === "all" ? (data.state || {}) : data
      hasChildren = Array.isArray(source.children) && source.children.length > 0
      hasTasks = Array.isArray(source.tasks) && source.tasks.length > 0
      hasRewards = Array.isArray(source.rewards) && source.rewards.length > 0
      hasRules = Array.isArray(source.rules) && source.rules.length > 0
      childrenCount = source.children?.length || 0
      tasksCount = source.tasks?.length || 0
      rewardsCount = source.rewards?.length || 0
      rulesCount = source.rules?.length || 0
    }

    return {
      isValid: true,
      format: "new",
      errors,
      warnings,
      hasChildren,
      hasTasks,
      hasRewards,
      hasRules,
      childrenCount,
      tasksCount,
      rewardsCount,
      rulesCount,
    }
  }

  // Check if it's a legacy format backup
  if (data.users && Array.isArray(data.users)) {
    hasChildren = data.users.length > 0
    childrenCount = data.users.length
    hasTasks = Array.isArray(data.tasks) && data.tasks.length > 0
    hasRewards = Array.isArray(data.rewards) && data.rewards.length > 0
    hasRules = Array.isArray(data.rules) && data.rules.length > 0
    tasksCount = data.tasks?.length || 0
    rewardsCount = data.rewards?.length || 0
    rulesCount = data.rules?.length || 0

    if (data.users.length === 0) {
      warnings.push("Backup enthält keine Kinder")
    }

    // Validate user structure - more lenient
    for (const user of data.users) {
      if (!user.name) {
        warnings.push(`Benutzer ohne Name gefunden`)
      }
    }

    return {
      isValid: true, // Be more lenient with legacy backups
      format: "legacy",
      errors,
      warnings,
      hasChildren,
      hasTasks,
      hasRewards,
      hasRules,
      childrenCount,
      tasksCount,
      rewardsCount,
      rulesCount,
    }
  }

  // Unknown format
  errors.push("Unbekanntes Backup-Format - weder 'users' noch 'type' gefunden")
  return {
    isValid: false,
    format: "unknown",
    errors,
    warnings,
    hasChildren: false,
    hasTasks: false,
    hasRewards: false,
    hasRules: false,
    childrenCount: 0,
    tasksCount: 0,
    rewardsCount: 0,
    rulesCount: 0,
  }
}

function mergeArrays<T extends { id: string }>(current: T[], backup: T[], option: MergeOption): T[] {
  switch (option) {
    case "keep-current":
      return current
    case "use-backup":
      return backup
    case "merge-both":
      const merged = [...current]
      const existingIds = new Set(current.map((item) => item.id))
      for (const item of backup) {
        if (!existingIds.has(item.id)) {
          merged.push(item)
        }
      }
      return merged
    default:
      return current
  }
}

export function migrateLegacyBackup(
  legacyData: LegacyBackup,
  currentState: FamilyState,
  options: ImportOptions = DEFAULT_IMPORT_OPTIONS,
): FamilyState {
  const now = new Date().toISOString()

  const backupChildren: Child[] = (legacyData.users || []).map((user, index) => {
    let totalPointsEarned = 0
    if (user.history) {
      totalPointsEarned = user.history.filter((h) => h.points > 0).reduce((sum, h) => sum + h.points, 0)
    }

    const currentPoints = typeof user.score === "number" ? user.score : 0

    return {
      id: user.id || generateId(),
      name: user.name || `Kind ${index + 1}`,
      age: 8,
      avatar: user.avatar || "🧒",
      color: ["#4ECDC4", "#FF6B6B", "#45B7D1", "#96CEB4", "#FFEAA7"][index % 5],
      points: currentPoints,
      totalPointsEarned: totalPointsEarned > 0 ? totalPointsEarned : Math.max(0, currentPoints),
      createdAt: now,
    }
  })

  const backupTasks: Task[] = (legacyData.tasks || []).map((task, index) => ({
    id: task.id || generateId(),
    title: task.title || task.name || "Aufgabe",
    description: task.description || "",
    note: task.note || "",
    emoji: task.emoji || task.icon || "📋",
    category: normalizeTaskCategory(task.category),
    difficulty: normalizeDifficulty(task.difficulty),
    points: typeof task.points === "number" ? task.points : 5,
    duration: typeof task.duration === "number" ? task.duration : undefined,
    days: convertDays(task.days),
    isActive: task.isActive !== false, // Default to true
    order: typeof task.order === "number" ? task.order : index,
    dailyLimit: task.dailyLimit,
    startTime: task.startTime,
    endTime: task.endTime,
    timerOptions: {
      showMiniTimer: true,
      showVisualTimer: true,
      showFocusTimer: true,
    },
  }))

  const backupRewards: Reward[] = (legacyData.rewards || []).map((reward) => ({
    id: reward.id || generateId(),
    name: reward.title || reward.name || "Belohnung",
    description: reward.description || "",
    emoji: reward.emoji || reward.icon || "🎁",
    cost: reward.cost || reward.points || 10,
    category: (reward.category as any) || "privilege",
    isActive: reward.isActive !== false,
    stock: reward.stock,
    dailyLimit: reward.dailyLimit,
  }))

  const backupRules: Rule[] = (legacyData.rules || []).map((rule, index) => {
    const points = typeof rule.points === "number" ? rule.points : 0
    return {
      id: rule.id || generateId(),
      title: rule.title || rule.name || "Regel",
      description: rule.description || "",
      emoji: rule.emoji || rule.icon || "⚖️",
      points: points,
      isPositive: rule.isPositive !== undefined ? rule.isPositive : points >= 0,
      category: (rule.category as any) || "behavior",
      isActive: rule.isActive !== false,
      dailyLimit: rule.dailyLimit,
      order: index,
    }
  })

  // Preserve sticker collections from legacy backup
  const stickerCollections = (legacyData.users || [])
    .filter((user) => user.unlockedStickers && user.unlockedStickers.length > 0)
    .map((user) => ({
      childId: user.id,
      stickers: user.unlockedStickers || [],
    }))

  // Apply merge options
  const children = mergeArrays(currentState.children, backupChildren, options.mergeChildren)
  const tasks = mergeArrays(currentState.tasks, backupTasks, options.mergeTasks)
  const rewards = mergeArrays(currentState.rewards, backupRewards, options.mergeRewards)
  const rules = mergeArrays(currentState.rules, backupRules, options.mergeRules)

  return {
    ...currentState,
    children,
    tasks,
    rewards,
    rules,
    stickerCollections: stickerCollections.length > 0 ? stickerCollections : currentState.stickerCollections,
    selectedChildId: children.length > 0 ? children[0].id : null,
    lastUpdated: now,
  }
}

export function importBackupWithMigration(
  data: any,
  currentState: FamilyState,
  options: ImportOptions = DEFAULT_IMPORT_OPTIONS,
): {
  success: boolean
  state?: FamilyState
  error?: string
  warnings?: string[]
  migrated?: boolean
  validation?: ValidationResult
} {
  // Validate backup
  const validation = validateBackup(data)

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errors.join("; "),
      validation,
    }
  }

  // Handle new format backups
  if (validation.format === "new") {
    try {
      let importedState: FamilyState

      switch (data.type) {
        case "settings":
          importedState = {
            ...currentState,
            settings: { ...DEFAULT_SETTINGS, ...data.settings },
            lastUpdated: new Date().toISOString(),
          }
          break

        case "data": {
          const backupChildren = (data.children || []).map((c: any, i: number) => normalizeChildFromBackup(c, i))
          const backupTasks = (data.tasks || []).map((t: any, i: number) => normalizeTaskFromBackup(t, i))
          const backupRewards = (data.rewards || []).map((r: any) => normalizeRewardFromBackup(r))
          const backupRules = (data.rules || []).map((r: any, i: number) => normalizeRuleFromBackup(r, i))
          importedState = {
            ...currentState,
            children: mergeArrays(currentState.children, backupChildren, options.mergeChildren),
            tasks: mergeArrays(currentState.tasks, backupTasks, options.mergeTasks),
            rewards: mergeArrays(currentState.rewards, backupRewards, options.mergeRewards),
            rules: mergeArrays(currentState.rules, backupRules, options.mergeRules),
            pets: mergeArrays(currentState.pets || [], data.pets || [], options.mergePets ?? "use-backup"),
            lastUpdated: new Date().toISOString(),
          }
          break
        }

        case "all": {
          const state = data.state || {}
          const backupChildren = (state.children || []).map((c: any, i: number) => normalizeChildFromBackup(c, i))
          const backupTasks = (state.tasks || []).map((t: any, i: number) => normalizeTaskFromBackup(t, i))
          const backupRewards = (state.rewards || []).map((r: any) => normalizeRewardFromBackup(r))
          const backupRules = (state.rules || []).map((r: any, i: number) => normalizeRuleFromBackup(r, i))
          importedState = {
            ...currentState,
            settings: { ...DEFAULT_SETTINGS, ...(state.settings || {}) },
            children: mergeArrays(currentState.children, backupChildren, options.mergeChildren),
            tasks: mergeArrays(currentState.tasks, backupTasks, options.mergeTasks),
            rewards: mergeArrays(currentState.rewards, backupRewards, options.mergeRewards),
            rules: mergeArrays(currentState.rules, backupRules, options.mergeRules),
            pets: mergeArrays(currentState.pets || [], state.pets || [], options.mergePets ?? "use-backup"),
            taskCompletions: Array.isArray(state.taskCompletions) ? state.taskCompletions : currentState.taskCompletions,
            rewardRedemptions: Array.isArray(state.rewardRedemptions) ? state.rewardRedemptions : currentState.rewardRedemptions,
            ruleApplications: Array.isArray(state.ruleApplications) ? state.ruleApplications : currentState.ruleApplications,
            pointAdjustments: Array.isArray(state.pointAdjustments) ? state.pointAdjustments : currentState.pointAdjustments,
            stickerCollections: Array.isArray(state.stickerCollections) ? state.stickerCollections : currentState.stickerCollections,
            selectedChildId: state.selectedChildId ?? currentState.selectedChildId,
            moodEntries: Array.isArray(state.moodEntries) ? state.moodEntries : currentState.moodEntries,
            weather: state.weather ?? currentState.weather,
            schoolTimes: Array.isArray(state.schoolTimes) ? state.schoolTimes : currentState.schoolTimes,
            achievements: Array.isArray(state.achievements) ? state.achievements : currentState.achievements,
            lastUpdated: new Date().toISOString(),
          }
          break
        }

        default:
          return {
            success: false,
            error: "Unbekannter Backup-Typ",
            validation,
          }
      }

      return {
        success: true,
        state: importedState,
        warnings: validation.warnings,
        migrated: false,
        validation,
      }
    } catch (error) {
      return {
        success: false,
        error: `Fehler beim Importieren: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        validation,
      }
    }
  }

  // Handle legacy format backups
  if (validation.format === "legacy") {
    try {
      const migratedState = migrateLegacyBackup(data as LegacyBackup, currentState, options)

      const appliedOptions: string[] = []
      if (options.mergeChildren === "use-backup" && validation.hasChildren) {
        appliedOptions.push(`${validation.childrenCount} Kind(er) importiert`)
      }
      if (options.mergeTasks === "use-backup" && validation.hasTasks) {
        appliedOptions.push(`${validation.tasksCount} Aufgabe(n) importiert`)
      }
      if (options.mergeRewards === "use-backup" && validation.hasRewards) {
        appliedOptions.push(`${validation.rewardsCount} Belohnung(en) importiert`)
      }
      if (options.mergeRules === "use-backup" && validation.hasRules) {
        appliedOptions.push(`${validation.rulesCount} Regel(n) importiert`)
      }

      return {
        success: true,
        state: migratedState,
        warnings: [
          ...validation.warnings,
          "Altes Backup-Format erkannt und erfolgreich konvertiert",
          ...appliedOptions,
        ],
        migrated: true,
        validation,
      }
    } catch (error) {
      return {
        success: false,
        error: `Fehler bei der Migration: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        validation,
      }
    }
  }

  return {
    success: false,
    error: "Unbekanntes Backup-Format",
    validation,
  }
}
