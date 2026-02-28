/**
 * PowerSync-Initialisierung – ausschließlich aufrufen im Client (Browser/Capacitor).
 * Keine Instanzerstellung auf Modulebene, damit Next.js beim Build/SSR nicht auf
 * @powersync/web / wa-sqlite (WASM/IndexedDB) zugreift.
 *
 * Phase 14: PowerSync ist pausiert; Sync läuft über Supabase Direct (Device ID).
 * Die App blockiert nicht auf waitForReady(), damit "Datenbank wird geladen…" nicht
 * hängen bleibt, wenn keine PowerSync-URL gesetzt ist.
 */

import { PowerSyncDatabase } from "@powersync/web"
import { AppSchema } from "./schema"
import { SupabaseConnector } from "@/lib/sync/SupabaseConnector"

let dbInstance: PowerSyncDatabase | null = null

/**
 * Erstellt einmalig eine PowerSyncDatabase-Instanz, verbindet den Connector im Hintergrund
 * und gibt die Instanz sofort zurück. Die UI blockiert nicht auf waitForReady().
 */
export async function setupPowerSync(): Promise<PowerSyncDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  const connector = new SupabaseConnector()
  const db = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: "powersync.db",
    },
  })

  dbInstance = db
  db.connect(connector)
    .then(() => (process.env.NEXT_PUBLIC_POWERSYNC_URL ? db.waitForReady() : undefined))
    .catch((err) => console.warn("[PowerSync] connect/waitForReady:", err))

  return db
}

/**
 * Gibt die aktuelle PowerSync-Instanz zurück oder null, wenn setupPowerSync() noch
 * nicht aufgerufen wurde.
 */
export function getPowerSyncInstance(): PowerSyncDatabase | null {
  return dbInstance
}
