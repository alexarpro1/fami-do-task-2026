/**
 * sync-v2 – Adapter-Schnittstellen für Sync und Update-Check.
 * Keine konkrete DB/Cloud; Implementierungen in eigenen Dateien.
 */

import type { SyncPayload } from "../types"
import type { RemoteVersion } from "../types"

export interface SyncAdapter {
  /** Lokale Änderungen hochladen. */
  push(payload: SyncPayload): Promise<{ ok: boolean; error?: string }>
  /** Neueste Daten herunterladen (z.B. letzter Stand der Familie). */
  pull(): Promise<{ ok: boolean; payload?: SyncPayload; error?: string }>
}

export interface UpdateCheckAdapter {
  /** Remote-Version abrufen (z.B. version.json). */
  getRemoteVersion(): Promise<RemoteVersion | null>
  /** URL zum Update (Store oder APK), optional. */
  getUpdateUrl?(): string | null
}
