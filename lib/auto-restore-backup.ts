/**
 * Nach Neuinstallation: Backup im Standardordner Dokumente/FamiDoBackup
 * (oder localStorage-Notfall) finden und wiederherstellen.
 */

import type { FamilyState } from "@/types"
import { isNativeApp } from "@/lib/device"
import {
  BACKUP_FOLDER,
  BACKUP_FOLDER_DISPLAY_PATH,
  getBackupStorageInfo,
} from "@/lib/daily-backup"
import { EMERGENCY_BACKUP_LS_KEY } from "@/lib/emergency-backup"
import { importBackupWithMigration, validateBackup } from "@/lib/backup-migration"
import { extractDevLogFromBackup, restoreDevLogFromSnapshot } from "@/lib/dev-log"

const PREF_AUTO_RESTORE_SKIP = "famiapp_auto_restore_skip_v1"

export type RestoreCandidate = {
  source: "native-file" | "localStorage"
  filename: string
  displayPath: string
  data: unknown
  childrenCount: number
  exportedAt?: string
}

/** Leerer / frischer State nach Reinstall (keine Kinder = kein Familien-Datenbestand). */
export function isEffectivelyEmptyFamilyState(state: FamilyState): boolean {
  return !state.children || state.children.length === 0
}

export async function wasAutoRestoreSkipped(): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    if (isNativeApp()) {
      const { Preferences } = await import("@capacitor/preferences")
      const { value } = await Preferences.get({ key: PREF_AUTO_RESTORE_SKIP })
      return value === "1"
    }
    return localStorage.getItem(PREF_AUTO_RESTORE_SKIP) === "1"
  } catch {
    return false
  }
}

export async function setAutoRestoreSkipped(skip: boolean): Promise<void> {
  if (typeof window === "undefined") return
  try {
    if (isNativeApp()) {
      const { Preferences } = await import("@capacitor/preferences")
      if (skip) await Preferences.set({ key: PREF_AUTO_RESTORE_SKIP, value: "1" })
      else await Preferences.remove({ key: PREF_AUTO_RESTORE_SKIP })
      return
    }
    if (skip) localStorage.setItem(PREF_AUTO_RESTORE_SKIP, "1")
    else localStorage.removeItem(PREF_AUTO_RESTORE_SKIP)
  } catch {
    // ignore
  }
}

function pickNewestBackupName(files: string[]): string | null {
  const preferred = files.filter(
    (f) =>
      f.toLowerCase().startsWith("famido-notfall-") ||
      f.toLowerCase().startsWith("famido-backup-"),
  )
  const list = preferred.length > 0 ? preferred : files
  if (list.length === 0) return null
  // getBackupStorageInfo liefert bereits sort().reverse() – neueste zuerst
  return list[0] ?? null
}

async function readNativeBackupJson(filename: string): Promise<string | null> {
  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem")
  const path = `${BACKUP_FOLDER}/${filename}`
  try {
    const res = await Filesystem.readFile({
      path,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    return typeof res.data === "string" ? res.data : null
  } catch {
    // Fallback: base64
    try {
      const res = await Filesystem.readFile({
        path,
        directory: Directory.Documents,
      })
      if (typeof res.data !== "string") return null
      const binary = atob(res.data)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return new TextDecoder().decode(bytes)
    } catch {
      return null
    }
  }
}

function parseAndValidate(json: string): RestoreCandidate | null {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  const validation = validateBackup(data)
  if (!validation.isValid || !validation.hasChildren) return null
  const o = data as { exportedAt?: string; type?: string }
  return {
    source: "native-file",
    filename: "",
    displayPath: "",
    data,
    childrenCount: validation.childrenCount ?? 0,
    exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : undefined,
  }
}

/**
 * Sucht das neueste nutzbare Backup (Native-Ordner, sonst localStorage-Notfall).
 */
export async function findRestoreCandidate(): Promise<RestoreCandidate | null> {
  if (typeof window === "undefined") return null

  if (isNativeApp()) {
    const info = await getBackupStorageInfo()
    const name = pickNewestBackupName(info.files)
    if (name) {
      const json = await readNativeBackupJson(name)
      if (json) {
        const candidate = parseAndValidate(json)
        if (candidate) {
          return {
            ...candidate,
            source: "native-file",
            filename: name,
            displayPath: `${BACKUP_FOLDER_DISPLAY_PATH}/${name}`,
          }
        }
      }
    }
  }

  try {
    const ls = localStorage.getItem(EMERGENCY_BACKUP_LS_KEY)
    if (ls && ls.length > 10) {
      const candidate = parseAndValidate(ls)
      if (candidate) {
        return {
          ...candidate,
          source: "localStorage",
          filename: "famiapp-emergency-backup-latest",
          displayPath: "localStorage (Notfall-Backup)",
        }
      }
    }
  } catch {
    // ignore
  }

  return null
}

export function applyRestoreCandidate(
  candidate: RestoreCandidate,
  currentState: FamilyState,
): { success: boolean; state?: FamilyState; error?: string } {
  const result = importBackupWithMigration(candidate.data, currentState)
  if (!result.success || !result.state) {
    return { success: false, error: result.error || "Import fehlgeschlagen" }
  }
  const logSnap = extractDevLogFromBackup(candidate.data)
  if (logSnap) {
    restoreDevLogFromSnapshot(logSnap, "replace")
  }
  return { success: true, state: result.state }
}
