/**
 * PowerSync Backend Connector für Supabase
 * Verbindet die lokale PowerSync-SQLite mit eurer Supabase (Postgres)-Datenbank.
 *
 * Benötigte Umgebungsvariablen:
 * - NEXT_PUBLIC_POWERSYNC_URL: PowerSync Service URL (z. B. von PowerSync Cloud)
 * - Optional: NEXT_PUBLIC_POWERSYNC_DEV_TOKEN für lokale Entwicklung
 * - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (bereits vorhanden)
 *
 * Authentifizierung: fetchCredentials liefert einen JWT (Supabase Session oder
 * PowerSync-Dev-Token). Später: eigenen Backend-Endpoint für PowerSync-Token nutzen.
 */

import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from "@powersync/web"
import { UpdateType } from "@powersync/web"
import { createClient } from "@/lib/supabase/client"

const POWERSYNC_URL = process.env.NEXT_PUBLIC_POWERSYNC_URL ?? ""
const DEV_TOKEN = process.env.NEXT_PUBLIC_POWERSYNC_DEV_TOKEN

/**
 * Connector für PowerSync: Credentials holen und lokale Schreiboperationen
 * an Supabase hochladen.
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  /**
   * Wird von PowerSync regelmäßig aufgerufen. Immer frische Credentials liefern.
   * Gibt null zurück, wenn Nutzer nicht eingeloggt (dann nur Offline-Nutzung).
   */
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    if (!POWERSYNC_URL) {
      console.warn("[PowerSync] NEXT_PUBLIC_POWERSYNC_URL nicht gesetzt.")
      return null
    }

    // Entwicklung: festen Token aus .env (PowerSync Dashboard → Dev Tokens)
    if (typeof DEV_TOKEN === "string" && DEV_TOKEN.length > 0) {
      return { endpoint: POWERSYNC_URL, token: DEV_TOKEN }
    }

    // Produktion: JWT aus Supabase Session (Supabase Auth)
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      return null
    }

    return { endpoint: POWERSYNC_URL, token }
  }

  /**
   * Lokale Änderungen (CRUD) an Supabase senden.
   * PowerSync ruft getCrudBatch() auf; wir mappen PUT/PATCH/DELETE auf Supabase.
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const supabase = createClient()
    const batch = await database.getCrudBatch()
    if (!batch) return

    try {
      for (const op of batch.crud) {
        if (op.table === "tasks") {
          if (op.op === UpdateType.PUT && op.opData) {
            const row = { id: op.id, ...mapTaskOpData(op.opData) }
            const { error } = await supabase.from("tasks").upsert(row, { onConflict: "id" })
            if (error) throw new Error(`tasks PUT: ${error.message}`)
          } else if (op.op === UpdateType.PATCH && op.opData) {
            const { error } = await supabase.from("tasks").update(mapTaskOpData(op.opData)).eq("id", op.id)
            if (error) throw new Error(`tasks PATCH: ${error.message}`)
          } else if (op.op === UpdateType.DELETE) {
            const { error } = await supabase.from("tasks").delete().eq("id", op.id)
            if (error) throw new Error(`tasks DELETE: ${error.message}`)
          }
        } else if (op.table === "task_completions") {
          if (op.op === UpdateType.PUT && op.opData) {
            const row = { id: op.id, ...mapTaskCompletionOpData(op.opData) }
            const { error } = await supabase.from("task_completions").upsert(row, { onConflict: "id" })
            if (error) throw new Error(`task_completions PUT: ${error.message}`)
          } else if (op.op === UpdateType.PATCH && op.opData) {
            const { error } = await supabase
              .from("task_completions")
              .update(mapTaskCompletionOpData(op.opData))
              .eq("id", op.id)
            if (error) throw new Error(`task_completions PATCH: ${error.message}`)
          } else if (op.op === UpdateType.DELETE) {
            const { error } = await supabase.from("task_completions").delete().eq("id", op.id)
            if (error) throw new Error(`task_completions DELETE: ${error.message}`)
          }
        } else if (op.table === "children") {
          if (op.op === UpdateType.PUT && op.opData) {
            const row = { id: op.id, ...mapChildrenOpData(op.opData) }
            const { error } = await supabase.from("children").upsert(row, { onConflict: "id" })
            if (error) throw new Error(`children PUT: ${error.message}`)
          } else if (op.op === UpdateType.PATCH && op.opData) {
            const { error } = await supabase
              .from("children")
              .update(mapChildrenOpData(op.opData))
              .eq("id", op.id)
            if (error) throw new Error(`children PATCH: ${error.message}`)
          } else if (op.op === UpdateType.DELETE) {
            const { error } = await supabase.from("children").delete().eq("id", op.id)
            if (error) throw new Error(`children DELETE: ${error.message}`)
          }
        } else if (op.table === "rewards") {
          if (op.op === UpdateType.PUT && op.opData) {
            const row = { id: op.id, ...mapRewardsOpData(op.opData) }
            const { error } = await supabase.from("rewards").upsert(row, { onConflict: "id" })
            if (error) throw new Error(`rewards PUT: ${error.message}`)
          } else if (op.op === UpdateType.PATCH && op.opData) {
            const { error } = await supabase.from("rewards").update(mapRewardsOpData(op.opData)).eq("id", op.id)
            if (error) throw new Error(`rewards PATCH: ${error.message}`)
          } else if (op.op === UpdateType.DELETE) {
            const { error } = await supabase.from("rewards").delete().eq("id", op.id)
            if (error) throw new Error(`rewards DELETE: ${error.message}`)
          }
        } else if (op.table === "reward_redemptions") {
          if (op.op === UpdateType.PUT && op.opData) {
            const row = { id: op.id, ...mapRewardRedemptionsOpData(op.opData) }
            const { error } = await supabase.from("reward_redemptions").upsert(row, { onConflict: "id" })
            if (error) throw new Error(`reward_redemptions PUT: ${error.message}`)
          } else if (op.op === UpdateType.PATCH && op.opData) {
            const { error } = await supabase
              .from("reward_redemptions")
              .update(mapRewardRedemptionsOpData(op.opData))
              .eq("id", op.id)
            if (error) throw new Error(`reward_redemptions PATCH: ${error.message}`)
          } else if (op.op === UpdateType.DELETE) {
            const { error } = await supabase.from("reward_redemptions").delete().eq("id", op.id)
            if (error) throw new Error(`reward_redemptions DELETE: ${error.message}`)
          }
        } else if (op.table === "rules") {
          if (op.op === UpdateType.PUT && op.opData) {
            const row = { id: op.id, ...mapRulesOpData(op.opData) }
            const { error } = await supabase.from("rules").upsert(row, { onConflict: "id" })
            if (error) throw new Error(`rules PUT: ${error.message}`)
          } else if (op.op === UpdateType.PATCH && op.opData) {
            const { error } = await supabase.from("rules").update(mapRulesOpData(op.opData)).eq("id", op.id)
            if (error) throw new Error(`rules PATCH: ${error.message}`)
          } else if (op.op === UpdateType.DELETE) {
            const { error } = await supabase.from("rules").delete().eq("id", op.id)
            if (error) throw new Error(`rules DELETE: ${error.message}`)
          }
        } else if (op.table === "rule_applications") {
          if (op.op === UpdateType.PUT && op.opData) {
            const row = { id: op.id, ...mapRuleApplicationsOpData(op.opData) }
            const { error } = await supabase.from("rule_applications").upsert(row, { onConflict: "id" })
            if (error) throw new Error(`rule_applications PUT: ${error.message}`)
          } else if (op.op === UpdateType.PATCH && op.opData) {
            const { error } = await supabase
              .from("rule_applications")
              .update(mapRuleApplicationsOpData(op.opData))
              .eq("id", op.id)
            if (error) throw new Error(`rule_applications PATCH: ${error.message}`)
          } else if (op.op === UpdateType.DELETE) {
            const { error } = await supabase.from("rule_applications").delete().eq("id", op.id)
            if (error) throw new Error(`rule_applications DELETE: ${error.message}`)
          }
        }
      }
      await batch.complete()
    } catch (e) {
      // Nicht complete() aufrufen – PowerSync kann den Batch erneut versuchen
      throw e
    }
  }
}

/** Spaltennamen von PowerSync-Schema auf Supabase-Spalten mappen (snake_case). */
function mapTaskOpData(opData: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    created_at: "created_at",
    title: "title",
    is_completed: "is_completed",
    assigned_to: "assigned_to",
    points: "points",
    description: "description",
    category: "category",
    emoji: "emoji",
    order: "order",
    is_active: "is_active",
    days: "days",
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(opData)) {
    out[map[k] ?? k] = v
  }
  return out
}

function mapTaskCompletionOpData(opData: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    created_at: "created_at",
    task_id: "task_id",
    child_id: "child_id",
    points_awarded: "points_awarded",
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(opData)) {
    out[map[k] ?? k] = v
  }
  return out
}

function mapChildrenOpData(opData: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    created_at: "created_at",
    name: "name",
    avatar: "avatar",
    color: "color",
    pin: "pin",
    is_active: "is_active",
    age: "age",
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(opData)) {
    out[map[k] ?? k] = v
  }
  return out
}

function mapRewardsOpData(opData: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    created_at: "created_at",
    title: "title",
    cost: "cost",
    emoji: "emoji",
    is_active: "is_active",
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(opData)) {
    out[map[k] ?? k] = v
  }
  return out
}

function mapRewardRedemptionsOpData(opData: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    created_at: "created_at",
    reward_id: "reward_id",
    child_id: "child_id",
    cost_at_redemption: "cost_at_redemption",
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(opData)) {
    out[map[k] ?? k] = v
  }
  return out
}

function mapRulesOpData(opData: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    created_at: "created_at",
    title: "title",
    point_impact: "point_impact",
    emoji: "emoji",
    is_active: "is_active",
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(opData)) {
    out[map[k] ?? k] = v
  }
  return out
}

function mapRuleApplicationsOpData(opData: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    created_at: "created_at",
    rule_id: "rule_id",
    child_id: "child_id",
    points_applied: "points_applied",
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(opData)) {
    out[map[k] ?? k] = v
  }
  return out
}
