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
        }
        // Weitere Tabellen (children, rewards, …) hier ergänzen
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
    const col = map[k] ?? k
    out[col] = v
  }
  return out
}
