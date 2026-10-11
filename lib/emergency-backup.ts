/**
 * Automatisches lokales Backup vor Zurücksetzen / schweren Fehlern.
 * – Web: Snapshot in localStorage (Schlüssel famiapp-emergency-backup-latest)
 * – Native: JSON-Datei unter Dokumente/FamiDoBackup/famido-notfall-*.json
 */

import { getPersistedStateRaw } from "@/lib/persistent-state"
import { isNativeApp } from "@/lib/device"
import { APP_VERSION } from "@/lib/version"
import { BACKUP_FOLDER } from "@/lib/daily-backup"

export const EMERGENCY_BACKUP_LS_KEY = "famiapp-emergency-backup-latest"

function buildBackupEnvelope(raw: string, reason: string, trigger: string) {
  const exportedAt = new Date().toISOString()
  try {
    const state = JSON.parse(raw) as unknown
    if (state && typeof state === "object") {
      return {
        type: "all" as const,
        version: APP_VERSION.full,
        exportedAt,
        state,
        _emergency: { reason, trigger },
      }
    }
  } catch {
    /* Rohstring sichern */
  }
  return {
    type: "emergency-raw" as const,
    version: APP_VERSION.full,
    exportedAt,
    reason,
    trigger,
    raw,
  }
}

/**
 * Sofortiger Snapshot in localStorage (synchron), z. B. bevor ungültiger State gelöscht wird.
 */
export function stashEmergencyBackupSync(raw: string, reason: string, trigger: string): void {
  if (typeof window === "undefined" || !raw || raw.length < 2) return
  try {
    const payload = buildBackupEnvelope(raw, reason, trigger)
    localStorage.setItem(EMERGENCY_BACKUP_LS_KEY, JSON.stringify(payload, null, 2))
  } catch (e) {
    console.warn("[emergency-backup] stashEmergencyBackupSync failed:", e)
  }
}

export type EmergencyBackupResult = {
  ok: boolean
  nativePath?: string
  localStorageSaved?: boolean
  error?: string
}

/**
 * Liest den persistierten App-State und legt Notfall-Backup an (localStorage + auf Handy Datei).
 * Optional `persistedRawOverride`, wenn der Speicher gleich überschrieben wird.
 */
export async function runEmergencyLocalBackup(opts: {
  reason: string
  trigger: string
  persistedRawOverride?: string | null
}): Promise<EmergencyBackupResult> {
  if (typeof window === "undefined") return { ok: false, error: "no_window" }

  const raw =
    opts.persistedRawOverride !== undefined && opts.persistedRawOverride !== null
      ? opts.persistedRawOverride
      : await getPersistedStateRaw()

  if (!raw || raw.length < 2) {
    return { ok: false, error: "no_data" }
  }

  const payload = buildBackupEnvelope(raw, opts.reason, opts.trigger)
  const json = JSON.stringify(payload, null, 2)

  let localStorageSaved = false
  try {
    localStorage.setItem(EMERGENCY_BACKUP_LS_KEY, json)
    localStorageSaved = true
  } catch (e) {
    console.warn("[emergency-backup] localStorage set failed:", e)
  }

  let nativePath: string | undefined
  if (isNativeApp()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem")
      const safeTs = new Date().toISOString().replace(/[:.]/g, "-")
      const filename = `famido-notfall-${safeTs}.json`
      const bytes = new TextEncoder().encode(json)
      let binary = ""
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
      const base64 = btoa(binary)
      try {
        await Filesystem.mkdir({
          path: BACKUP_FOLDER,
          directory: Directory.Documents,
          recursive: true,
        })
      } catch (mkdirErr: unknown) {
        const msg = mkdirErr instanceof Error ? mkdirErr.message : String(mkdirErr)
        if (!msg.includes("already exist") && !msg.includes("already exists")) throw mkdirErr
      }
      await Filesystem.writeFile({
        path: `${BACKUP_FOLDER}/${filename}`,
        data: base64,
        directory: Directory.Documents,
      })
      nativePath = `${BACKUP_FOLDER}/${filename}`
    } catch (e) {
      console.error("[emergency-backup] native Filesystem.writeFile failed:", e)
    }
  }

  const ok = localStorageSaved || Boolean(nativePath)
  return {
    ok,
    nativePath,
    localStorageSaved,
    error: ok ? undefined : "write_failed",
  }
}
