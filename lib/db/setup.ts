/**
 * PowerSync-Initialisierung – ausschließlich aufrufen im Client (Browser/Capacitor).
 * Keine Instanzerstellung auf Modulebene, damit Next.js beim Build/SSR nicht auf
 * @powersync/web / wa-sqlite (WASM/IndexedDB) zugreift.
 */

import { PowerSyncDatabase } from "@powersync/web"
import { AppSchema } from "./schema"
import { SupabaseConnector } from "@/lib/sync/SupabaseConnector"

let dbInstance: PowerSyncDatabase | null = null

/**
 * Erstellt einmalig eine PowerSyncDatabase-Instanz, verbindet den Supabase-Connector
 * und gibt die Instanz zurück. Beim erneuten Aufruf wird dieselbe Instanz zurückgegeben.
 * Nur im Browser aufrufen (z. B. aus einem useEffect in einer "use client"-Komponente).
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

  await db.connect(connector)
  await db.waitForReady()

  dbInstance = db
  return db
}

/**
 * Gibt die aktuelle PowerSync-Instanz zurück oder null, wenn setupPowerSync() noch
 * nicht aufgerufen wurde.
 */
export function getPowerSyncInstance(): PowerSyncDatabase | null {
  return dbInstance
}

/**
 * Trennt die Verbindung und verbindet erneut (z. B. für "Jetzt synchronisieren").
 * Nur aufrufen, wenn setupPowerSync() bereits ausgeführt wurde.
 */
export async function reconnectPowerSync(): Promise<void> {
  if (!dbInstance) return
  const connector = new SupabaseConnector()
  await dbInstance.disconnect()
  await dbInstance.connect(connector)
}
