/**
 * Phase 14: Importierte Backup-Daten mit aktueller sync_id in Supabase schreiben.
 * Wird nach Backup-Import aufgerufen, damit Daten in die Cloud fließen.
 * Bei RLS-Fehler: Fallback auf RPC push_backup_data (SECURITY DEFINER).
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
import { createClient } from "@/lib/supabase/client"

const isRlsError = (err: string) => /row-level security|violates row-level security/i.test(err)

/** Optional: dieselbe Client-Instanz wie bei ensureSyncIdInAuth übergeben, damit die Session (JWT) mitgeschickt wird. */
export async function pushImportedStateToSupabase(
  state: FamilyState,
  syncId: string,
  supabaseClient?: ReturnType<typeof createClient>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = supabaseClient ?? createClient()
  const firstChildId = state.children[0]?.id ?? ""

  const pushFullState = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from("family_state").upsert(
        {
          sync_id: syncId,
          payload: state,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "sync_id" }
      )
      if (error) return { ok: false, error: `family_state: ${error.message}` }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  const tryDirect = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const fullState = await pushFullState()
      if (!fullState.ok) return fullState

      if (state.children.length > 0) {
          const rows = state.children.map((c: Child) => ({
          id: c.id,
          sync_id: syncId,
          name: c.name ?? "",
          avatar: c.avatar ?? "👤",
          color: c.color ?? "#94a3b8",
          pin: null,
          is_active: true,
          age: c.age ?? null,
        }))
        const { error } = await supabase.from("children").upsert(rows, { onConflict: "id" })
        if (error) return { ok: false, error: `children: ${error.message}` }
      }

      if (state.tasks.length > 0) {
        const rows = state.tasks.map((t: Task) => ({
          id: t.id,
          sync_id: syncId,
          title: t.title ?? "",
          is_completed: false,
          assigned_to: firstChildId,
          points: t.points ?? 0,
          description: t.description ?? null,
          category: t.category ?? null,
          emoji: t.emoji ?? null,
          order: t.order ?? 0,
          is_active: t.isActive !== false,
          days: Array.isArray(t.days) ? JSON.stringify(t.days) : null,
        }))
        const { error } = await supabase.from("tasks").upsert(rows, { onConflict: "id" })
        if (error) return { ok: false, error: `tasks: ${error.message}` }
      }

      if (state.rewards.length > 0) {
        const rows = state.rewards.map((r: Reward) => ({
          id: r.id,
          sync_id: syncId,
          title: r.name ?? "",
          cost: r.cost ?? 0,
          emoji: r.emoji ?? "🎁",
          is_active: r.isActive !== false,
        }))
        const { error } = await supabase.from("rewards").upsert(rows, { onConflict: "id" })
        if (error) return { ok: false, error: `rewards: ${error.message}` }
      }

      if (state.rules.length > 0) {
        const rows = state.rules.map((r: Rule) => ({
          id: r.id,
          sync_id: syncId,
          title: r.title ?? "",
          point_impact: (r.points ?? 0) * (r.isPositive ? 1 : -1),
          emoji: r.emoji ?? "⚖️",
          is_active: r.isActive !== false,
        }))
        const { error } = await supabase.from("rules").upsert(rows, { onConflict: "id" })
        if (error) return { ok: false, error: `rules: ${error.message}` }
      }

      if (state.taskCompletions.length > 0) {
        const rows = state.taskCompletions.map((c: TaskCompletion) => ({
          id: c.id,
          sync_id: syncId,
          task_id: c.taskId,
          child_id: c.childId,
          points_awarded: c.pointsEarned ?? 0,
          created_at: c.completedAt ?? new Date().toISOString(),
        }))
        const { error } = await supabase.from("task_completions").upsert(rows, { onConflict: "id" })
        if (error) return { ok: false, error: `task_completions: ${error.message}` }
      }

      if (state.rewardRedemptions.length > 0) {
        const rows = state.rewardRedemptions.map((r: RewardRedemption) => ({
          id: r.id,
          sync_id: syncId,
          reward_id: r.rewardId,
          child_id: r.childId,
          cost_at_redemption: r.pointsSpent ?? 0,
          created_at: r.redeemedAt ?? new Date().toISOString(),
        }))
        const { error } = await supabase.from("reward_redemptions").upsert(rows, { onConflict: "id" })
        if (error) return { ok: false, error: `reward_redemptions: ${error.message}` }
      }

      if (state.ruleApplications.length > 0) {
        const rows = state.ruleApplications.map((r: RuleApplication) => ({
          id: r.id,
          sync_id: syncId,
          rule_id: r.ruleId,
          child_id: r.childId,
          points_applied: r.pointsChanged ?? 0,
          created_at: r.appliedAt ?? new Date().toISOString(),
        }))
        const { error } = await supabase.from("rule_applications").upsert(rows, { onConflict: "id" })
        if (error) return { ok: false, error: `rule_applications: ${error.message}` }
      }

      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  const tryViaRpc = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const pChildren = state.children.map((c: Child) => ({
        id: c.id,
        name: c.name ?? "",
        avatar: c.avatar ?? "👤",
        color: c.color ?? "#94a3b8",
        age: c.age ?? null,
      }))
      const pTasks = state.tasks.map((t: Task) => ({
        id: t.id,
        title: t.title ?? "",
        points: t.points ?? 0,
        description: t.description ?? null,
        category: t.category ?? null,
        emoji: t.emoji ?? null,
        order: t.order ?? 0,
        is_active: t.isActive !== false,
        days: Array.isArray(t.days) ? JSON.stringify(t.days) : null,
      }))
      const pRewards = state.rewards.map((r: Reward) => ({
        id: r.id,
        title: r.name ?? "",
        cost: r.cost ?? 0,
        emoji: r.emoji ?? "🎁",
        is_active: r.isActive !== false,
      }))
      const pRules = state.rules.map((r: Rule) => ({
        id: r.id,
        title: r.title ?? "",
        point_impact: (r.points ?? 0) * (r.isPositive ? 1 : -1),
        emoji: r.emoji ?? "⚖️",
        is_active: r.isActive !== false,
      }))
      const pTaskCompletions = state.taskCompletions.map((c: TaskCompletion) => ({
        id: c.id,
        task_id: c.taskId,
        child_id: c.childId,
        points_awarded: c.pointsEarned ?? 0,
        created_at: c.completedAt ?? new Date().toISOString(),
      }))
      const pRewardRedemptions = state.rewardRedemptions.map((r: RewardRedemption) => ({
        id: r.id,
        reward_id: r.rewardId,
        child_id: r.childId,
        cost_at_redemption: r.pointsSpent ?? 0,
        created_at: r.redeemedAt ?? new Date().toISOString(),
      }))
      const pRuleApplications = state.ruleApplications.map((r: RuleApplication) => ({
        id: r.id,
        rule_id: r.ruleId,
        child_id: r.childId,
        points_applied: r.pointsChanged ?? 0,
        created_at: r.appliedAt ?? new Date().toISOString(),
      }))

      const { data, error } = await supabase.rpc("push_backup_data", {
        p_sync_id: syncId,
        p_family_state: state,
        p_children: pChildren,
        p_tasks: pTasks,
        p_rewards: pRewards,
        p_rules: pRules,
        p_task_completions: pTaskCompletions,
        p_reward_redemptions: pRewardRedemptions,
        p_rule_applications: pRuleApplications,
      })

      if (error) return { ok: false, error: `rpc: ${error.message}` }
      const res = data as { ok?: boolean; error?: string } | null
      if (res && res.ok === false && res.error) return { ok: false, error: res.error }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  const direct = await tryDirect()
  if (direct.ok) return direct
  if (isRlsError(direct.error ?? "")) {
    const rpc = await tryViaRpc()
    if (rpc.ok) return rpc
  }
  return direct
}
