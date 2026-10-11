/**
 * Phase 14 Data Layer: Daten aus Supabase laden (sync_id) und in FamilyState mappen.
 */

import type {
  FamilyState,
  Child,
  Task,
  Reward,
  Rule,
  TaskCompletion,
  RewardRedemption,
  RuleApplication,
} from "@/types"
import type { TaskCategory, TaskDifficulty } from "@/types"
import { createClient } from "@/lib/supabase/client"

const DEFAULT_CATEGORY: TaskCategory = "custom"
const DEFAULT_DIFFICULTY: TaskDifficulty = "medium"

function parseDays(days: string | null): string[] {
  if (!days) return []
  try {
    const arr = JSON.parse(days)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/**
 * Lädt alle Sync-Daten für eine sync_id aus Supabase und mappt sie in App-Form.
 * Punkte pro Kind werden aus task_completions, reward_redemptions und rule_applications berechnet.
 */
export async function fetchFamilyStateFromSupabase(
  syncId: string
): Promise<Partial<FamilyState> | null> {
  const supabase = createClient()

  // Phase 14 (V2): Primärer Weg = kompletter App-State als JSON-Payload.
  const { data: fullStateRow, error: fullStateError } = await supabase
    .from("family_state")
    .select("payload, last_updated")
    .eq("sync_id", syncId)
    .maybeSingle()

  if (!fullStateError && fullStateRow?.payload && typeof fullStateRow.payload === "object") {
    const payload = fullStateRow.payload as Partial<FamilyState>
    return {
      ...payload,
      children: Array.isArray(payload.children) ? payload.children : [],
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
      taskCompletions: Array.isArray(payload.taskCompletions) ? payload.taskCompletions : [],
      rewards: Array.isArray(payload.rewards) ? payload.rewards : [],
      rewardRedemptions: Array.isArray(payload.rewardRedemptions) ? payload.rewardRedemptions : [],
      rules: Array.isArray(payload.rules) ? payload.rules : [],
      ruleApplications: Array.isArray(payload.ruleApplications) ? payload.ruleApplications : [],
      pointAdjustments: Array.isArray(payload.pointAdjustments) ? payload.pointAdjustments : [],
      pets: Array.isArray(payload.pets) ? payload.pets : [],
      stickerCollections: Array.isArray(payload.stickerCollections) ? payload.stickerCollections : [],
      moodEntries: Array.isArray(payload.moodEntries) ? payload.moodEntries : [],
      schoolTimes: Array.isArray(payload.schoolTimes) ? payload.schoolTimes : [],
      achievements: Array.isArray(payload.achievements) ? payload.achievements : [],
    }
  }

  const [
    { data: childrenRows, error: eChildren },
    { data: tasksRows, error: eTasks },
    { data: completionsRows, error: eCompletions },
    { data: rewardsRows, error: eRewards },
    { data: redemptionsRows, error: eRedemptions },
    { data: rulesRows, error: eRules },
    { data: ruleAppsRows, error: eRuleApps },
  ] = await Promise.all([
    supabase.from("children").select("*").eq("sync_id", syncId).order("name"),
    supabase.from("tasks").select("*").eq("sync_id", syncId).order("order"),
    supabase.from("task_completions").select("*").eq("sync_id", syncId),
    supabase.from("rewards").select("*").eq("sync_id", syncId).order("title"),
    supabase.from("reward_redemptions").select("*").eq("sync_id", syncId),
    supabase.from("rules").select("*").eq("sync_id", syncId).order("title"),
    supabase.from("rule_applications").select("*").eq("sync_id", syncId),
  ])

  if (
    eChildren ||
    eTasks ||
    eCompletions ||
    eRewards ||
    eRedemptions ||
    eRules ||
    eRuleApps
  ) {
    console.warn("[supabase-sync] Fetch error:", eChildren || eTasks || eCompletions || eRewards || eRedemptions || eRules || eRuleApps)
    return null
  }

  const completions = (completionsRows ?? []) as { child_id: string; points_awarded: number }[]
  const redemptions = (redemptionsRows ?? []) as { child_id: string; cost_at_redemption: number }[]
  const ruleApps = (ruleAppsRows ?? []) as { child_id: string; points_applied: number; status?: string }[]

  const pointsByChild = new Map<string, { points: number; totalPointsEarned: number }>()
  for (const c of completions) {
    const cur = pointsByChild.get(c.child_id) ?? { points: 0, totalPointsEarned: 0 }
    cur.totalPointsEarned += c.points_awarded
    pointsByChild.set(c.child_id, cur)
  }
  for (const r of ruleApps) {
    if (r.status && r.status !== "approved") continue
    const cur = pointsByChild.get(r.child_id) ?? { points: 0, totalPointsEarned: 0 }
    cur.totalPointsEarned += r.points_applied
    pointsByChild.set(r.child_id, cur)
  }
  for (const r of redemptions) {
    const cur = pointsByChild.get(r.child_id) ?? { points: 0, totalPointsEarned: 0 }
    cur.points -= r.cost_at_redemption
    pointsByChild.set(r.child_id, cur)
  }
  for (const [, v] of pointsByChild) {
    v.points = v.totalPointsEarned + v.points
  }

  const children: Child[] = (childrenRows ?? []).map((row: Record<string, unknown>) => {
    const pc = pointsByChild.get(row.id as string) ?? { points: 0, totalPointsEarned: 0 }
    return {
      id: row.id as string,
      name: (row.name as string) ?? "",
      age: typeof row.age === "number" ? row.age : 0,
      avatar: (row.avatar as string) ?? "👤",
      color: (row.color as string) ?? "#94a3b8",
      points: pc.points,
      totalPointsEarned: pc.totalPointsEarned,
      createdAt: new Date().toISOString(),
    }
  })

  const tasks: Task[] = (tasksRows ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? undefined,
    points: typeof row.points === "number" ? row.points : 0,
    category: (row.category as TaskCategory) ?? DEFAULT_CATEGORY,
    difficulty: DEFAULT_DIFFICULTY,
    emoji: (row.emoji as string) ?? "✅",
    days: parseDays(row.days as string | null),
    isActive: row.is_active !== false,
    order: typeof row.order === "number" ? row.order : 0,
  }))

  const taskCompletions: TaskCompletion[] = (completionsRows ?? []).map(
    (row: Record<string, unknown>) => ({
      id: row.id as string,
      taskId: row.task_id as string,
      childId: row.child_id as string,
      completedAt: (row.created_at as string) ?? new Date().toISOString(),
      pointsEarned: typeof row.points_awarded === "number" ? row.points_awarded : 0,
      withTimer: false,
    })
  )

  const rewards: Reward[] = (rewardsRows ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: (row.title as string) ?? "",
    cost: typeof row.cost === "number" ? row.cost : 0,
    emoji: (row.emoji as string) ?? "🎁",
    category: "experience" as const,
    isActive: row.is_active !== false,
  }))

  const rewardRedemptions: RewardRedemption[] = (redemptionsRows ?? []).map(
    (row: Record<string, unknown>) => ({
      id: row.id as string,
      rewardId: row.reward_id as string,
      childId: row.child_id as string,
      redeemedAt: (row.created_at as string) ?? new Date().toISOString(),
      pointsSpent: typeof row.cost_at_redemption === "number" ? row.cost_at_redemption : 0,
    })
  )

  const rules: Rule[] = (rulesRows ?? []).map((row: Record<string, unknown>) => {
    const impact = typeof row.point_impact === "number" ? row.point_impact : 0
    return {
      id: row.id as string,
      title: (row.title as string) ?? "",
      points: Math.abs(impact),
      isPositive: impact >= 0,
      emoji: (row.emoji as string) ?? "⚖️",
      category: "behavior" as const,
      isActive: row.is_active !== false,
      requiresApproval: row.requires_approval === true,
    }
  })

  const ruleApplications: RuleApplication[] = (ruleAppsRows ?? []).map(
    (row: Record<string, unknown>) => ({
      id: row.id as string,
      ruleId: row.rule_id as string,
      childId: row.child_id as string,
      appliedAt: (row.created_at as string) ?? new Date().toISOString(),
      pointsChanged: typeof row.points_applied === "number" ? row.points_applied : 0,
      status: (row.status as "pending" | "approved" | "rejected") ?? "approved",
    })
  )

  return {
    children,
    tasks,
    taskCompletions,
    rewards,
    rewardRedemptions,
    rules,
    ruleApplications,
  }
}

/** Gerätezeile für Device-Dashboard (devices-Tabelle, pro Gerät). */
export interface DeviceRow {
  id: string
  sync_id?: string
  device_name?: string | null
  device_model?: string | null
  last_active?: string | null
}

/** Verbundene Geräte für einen sync_id laden. */
export async function fetchConnectedDevices(syncId: string): Promise<DeviceRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("devices")
    .select("id, sync_id, device_name, device_model, last_active")
    .eq("sync_id", syncId)
  if (error) {
    console.warn("[supabase-sync] fetchConnectedDevices:", error.message)
    return []
  }
  return (data ?? []) as DeviceRow[]
}

/** Anzahl Aufgaben und Belohnungen für einen sync_id. */
export async function fetchSyncStats(syncId: string): Promise<{ tasks: number; rewards: number }> {
  const supabase = createClient()
  const [tasksRes, rewardsRes] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("sync_id", syncId),
    supabase.from("rewards").select("id", { count: "exact", head: true }).eq("sync_id", syncId),
  ])
  return {
    tasks: tasksRes.count ?? 0,
    rewards: rewardsRes.count ?? 0,
  }
}

/** Phase 15: Preview für fremden Code (RPC get_cloud_preview). Nur Lesen, kein JWT-Wechsel. */
export interface CloudPreviewResult {
  children_count: number
  tasks_count: number
  rewards_count: number
  last_updated: string | null
  /** true wenn unter diesem Sync-Code bereits Daten liegen. */
  hasData?: boolean
  payload?: Partial<FamilyState>
  /** Fehler von der RPC (z. B. "sync_id required") oder vom Client (z. B. RPC nicht vorhanden). */
  error?: string
}

export async function fetchCloudPreview(syncId: string): Promise<CloudPreviewResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("get_cloud_preview", { p_sync_id: syncId.trim() })
  if (error) {
    console.warn("[supabase-sync] get_cloud_preview:", error.message)
    const hint = /function.*does not exist|relation.*does not exist/i.test(error.message)
      ? " RPC get_cloud_preview fehlt – bitte Skript scripts/005-get-cloud-preview-rpc.sql in Supabase (SQL-Editor) ausführen."
      : ""
    return {
      children_count: 0,
      tasks_count: 0,
      rewards_count: 0,
      last_updated: null,
      hasData: false,
      error: error.message + hint,
    }
  }
  if (data?.error) {
    return {
      children_count: 0,
      tasks_count: 0,
      rewards_count: 0,
      last_updated: null,
      hasData: false,
      error: data.error as string,
    }
  }
  const result = data as CloudPreviewResult
  result.hasData =
    (result.children_count ?? 0) + (result.tasks_count ?? 0) + (result.rewards_count ?? 0) > 0
  return result
}
