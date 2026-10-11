/**
 * Tägliches lokales Backup (nur in der nativen App).
 * Wenn aktiviert: Backup wird in Dokumente/FamiDoBackup gespeichert, maximal einmal pro Tag.
 */

import type { FamilyState } from "@/types"
import { APP_VERSION } from "@/lib/version"
import { isNativeApp } from "@/lib/device"

const PREF_DAILY_BACKUP_ENABLED = "famiapp_daily_backup_enabled"
const PREF_LAST_DAILY_BACKUP_AT = "famiapp_last_daily_backup_at"
const BACKUP_FOLDER = "FamiDoBackup"
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export async function getDailyBackupEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const { value } = await Preferences.get({ key: PREF_DAILY_BACKUP_ENABLED })
    return value === "true"
  } catch {
    return false
  }
}

export async function setDailyBackupEnabled(enabled: boolean): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { Preferences } = await import("@capacitor/preferences")
    await Preferences.set({ key: PREF_DAILY_BACKUP_ENABLED, value: enabled ? "true" : "false" })
  } catch (e) {
    console.error("[daily-backup] setDailyBackupEnabled failed:", e)
  }
}

export async function getLastDailyBackupAt(): Promise<string | null> {
  if (!isNativeApp()) return null
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const { value } = await Preferences.get({ key: PREF_LAST_DAILY_BACKUP_AT })
    return value
  } catch {
    return null
  }
}

/** Anzeige-Pfad des Backup-Ordners (nur Info). */
export const BACKUP_FOLDER_DISPLAY_PATH = "Dokumente/FamiDoBackup"

/**
 * Liefert Pfad und Liste der Backup-Dateien im lokalen Backup-Ordner (nur native App).
 */
export async function getBackupStorageInfo(): Promise<{ path: string; files: string[] }> {
  const path = BACKUP_FOLDER_DISPLAY_PATH
  if (!isNativeApp()) return { path, files: [] }
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem")
    const result = await Filesystem.readdir({
      path: BACKUP_FOLDER,
      directory: Directory.Documents,
    })
    const raw = result.files || []
    const names = raw
      .map((f): string | null => {
        if (typeof f === "string") return f
        if (typeof f === "object" && f !== null && "name" in f && typeof (f as { name: unknown }).name === "string")
          return (f as { name: string }).name
        return null
      })
      .filter((n): n is string => typeof n === "string" && n.endsWith(".json"))
    const files = [...names].sort().reverse()
    return { path, files }
  } catch {
    return { path, files: [] }
  }
}

/**
 * Schreibt ein vollständiges Backup in den App-Dokumente-Ordner (Dokumente/FamiDoBackup),
 * wenn tägliches Backup aktiviert ist und das letzte Backup älter als 24 Stunden ist.
 */
export async function writeDailyBackupIfDue(state: FamilyState): Promise<{ written: boolean; path?: string }> {
  if (!isNativeApp()) return { written: false }

  const enabled = await getDailyBackupEnabled()
  if (!enabled) return { written: false }

  const lastAt = await getLastDailyBackupAt()
  const now = Date.now()
  if (lastAt) {
    const last = new Date(lastAt).getTime()
    if (now - last < ONE_DAY_MS) return { written: false }
  }

  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem")
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `famido-backup-${dateStr}.json`
    const backup = {
      type: "all",
      version: APP_VERSION.full,
      exportedAt: new Date().toISOString(),
      state,
    }
    const json = JSON.stringify(backup, null, 2)
    // Capacitor Filesystem erwartet base64-kodierte Daten (UTF-8-sicher)
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
      if (!msg.includes("already exist") && !msg.includes("already exists")) {
        throw mkdirErr
      }
    }

    await Filesystem.writeFile({
      path: `${BACKUP_FOLDER}/${filename}`,
      data: base64,
      directory: Directory.Documents,
    })

    const { Preferences } = await import("@capacitor/preferences")
    await Preferences.set({ key: PREF_LAST_DAILY_BACKUP_AT, value: new Date().toISOString() })

    return { written: true, path: `${BACKUP_FOLDER}/${filename}` }
  } catch (e) {
    console.error("[daily-backup] writeDailyBackupIfDue failed:", e)
    return { written: false }
  }
}
