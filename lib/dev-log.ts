/**
 * Entwickler-Protokoll: ring buffer in localStorage (+ Preferences auf Native).
 * Einträge beschreiben Aktion, Detail, betroffene Funktion und ggf. Fehler.
 */

import { getDeviceKvSync, setDeviceKvSync, removeDeviceKvSync } from "@/lib/device-kv"
import { APP_VERSION } from "@/lib/version"

export type DevLogLevel = "info" | "warn" | "error" | "persist"

export type DevLogEntry = {
  t: string
  level: DevLogLevel
  /** Kurz-Aktion, z. B. „Speichern“, „App starten“ */
  action: string
  /** Lesbare Beschreibung, was genau passiert ist */
  detail: string
  /** Betroffene Funktion / Modul */
  fn?: string
  /** Fehlermeldung, falls vorhanden */
  error?: string
  /** Bereich/Kategorie (Filter) */
  tag: string
  /** @deprecated ältere Einträge */
  msg?: string
}

export type DevLogInput = {
  level: DevLogLevel
  action: string
  detail: string
  fn?: string
  error?: unknown
  tag?: string
}

/** Snapshot für Backup / externe Datei */
export type DevLogSnapshot = {
  type: "dev-log"
  version: string
  exportedAt: string
  enabled: boolean
  entries: DevLogEntry[]
}

const ENABLED_KEY = "famiapp-dev-log-enabled"
const LOG_KEY = "famiapp-dev-log"
const MAX_ENTRIES = 500

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((l) => {
    try {
      l()
    } catch {
      /* ignore */
    }
  })
}

export function subscribeDevLog(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isDevLogEnabled(): boolean {
  return getDeviceKvSync(ENABLED_KEY) === "1"
}

function errorToString(error: unknown): string | undefined {
  if (error == null) return undefined
  if (error instanceof Error) {
    return error.message ? `${error.name}: ${error.message}` : error.name
  }
  return String(error).slice(0, 400)
}

/** Freundliche Bezeichnung für Storage-Keys (UI-Prefs). */
export function describePrefKey(key: string): string {
  const map: Record<string, string> = {
    "famiapp-view-mode:games": "Ansicht Spiele (Liste/Kachel)",
    "famiapp-view-mode:tasks": "Ansicht Aufgaben",
    "famiapp-view-mode:rules": "Ansicht Regeln",
    "famiapp-view-mode:admin-children": "Ansicht Admin-Kinder",
    "famiapp-view-mode:admin-tasks": "Ansicht Admin-Aufgaben",
    "famiapp-view-mode:admin-rules": "Ansicht Admin-Regeln",
    "famiapp-view-mode:admin-rewards": "Ansicht Admin-Shop",
    "famiapp-pref:games-sort": "Sortierung Spiele",
    "famiapp-pref:rules-sort": "Sortierung Regeln",
    "famiapp-pref:rewards-sort": "Sortierung Shop",
    "famiapp-state": "App-Hauptdaten (Kinder, Aufgaben, Regeln, …)",
    "famiapp-dev-log": "Entwickler-Protokoll",
    "famiapp-dev-log-enabled": "Protokollierung ein/aus",
  }
  if (map[key]) return map[key]
  if (key.startsWith("famiapp-view-mode:")) return `Ansicht „${key.slice("famiapp-view-mode:".length)}“`
  if (key.startsWith("famiapp-pref:")) return `Einstellung „${key.slice("famiapp-pref:".length)}“`
  return key
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} Zeichen`
  return `${(n / 1024).toFixed(1)} KB`
}

export function describeStateSize(charCount: number): string {
  return formatBytes(charCount)
}

export function setDevLogEnabled(enabled: boolean): void {
  setDeviceKvSync(ENABLED_KEY, enabled ? "1" : "0")
  if (enabled) {
    const entry: DevLogEntry = {
      t: new Date().toISOString(),
      level: "info",
      tag: "Protokoll",
      action: "Protokollierung",
      detail: "Entwickler-Protokollierung wurde eingeschaltet. Ab jetzt werden Aktionen und Fehler aufgezeichnet.",
      fn: "setDevLogEnabled",
    }
    writeEntries([...readEntries(), entry])
  }
  notify()
}

function normalizeEntry(raw: unknown): DevLogEntry | null {
  if (!raw || typeof raw !== "object") return null
  const e = raw as Record<string, unknown>
  const level = e.level
  if (level !== "info" && level !== "warn" && level !== "error" && level !== "persist") return null
  if (typeof e.t !== "string") return null

  // Neues Format
  if (typeof e.action === "string" && typeof e.detail === "string") {
    return {
      t: e.t,
      level,
      action: e.action,
      detail: e.detail.slice(0, 800),
      fn: typeof e.fn === "string" ? e.fn : undefined,
      error: typeof e.error === "string" ? e.error.slice(0, 400) : undefined,
      tag: typeof e.tag === "string" ? e.tag : e.action,
    }
  }

  // Altes Format (msg)
  if (typeof e.msg === "string" && typeof e.tag === "string") {
    return {
      t: e.t,
      level,
      tag: e.tag,
      action: e.tag,
      detail: e.msg.slice(0, 800),
      msg: e.msg,
    }
  }

  return null
}

function readEntries(): DevLogEntry[] {
  try {
    const raw = getDeviceKvSync(LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeEntry).filter((x): x is DevLogEntry => x != null)
  } catch {
    return []
  }
}

function writeEntries(entries: DevLogEntry[]): void {
  try {
    setDeviceKvSync(LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    /* ignore */
  }
}

export function getDevLogEntries(): DevLogEntry[] {
  return readEntries()
}

export function clearDevLog(): void {
  removeDeviceKvSync(LOG_KEY)
  notify()
}

/** Strukturierter Log-Eintrag (bevorzugt). */
export function devLog(input: DevLogInput): void
/** @deprecated Kurzform – bitte action/detail/fn nutzen */
export function devLog(level: DevLogLevel, tag: string, msg: string): void
export function devLog(
  levelOrInput: DevLogLevel | DevLogInput,
  tag?: string,
  msg?: string,
): void {
  if (!isDevLogEnabled()) return

  let entry: DevLogEntry
  if (typeof levelOrInput === "object") {
    const err = errorToString(levelOrInput.error)
    entry = {
      t: new Date().toISOString(),
      level: levelOrInput.level,
      action: levelOrInput.action.slice(0, 80),
      detail: levelOrInput.detail.slice(0, 800),
      fn: levelOrInput.fn?.slice(0, 120),
      error: err,
      tag: (levelOrInput.tag || levelOrInput.action).slice(0, 40),
    }
  } else {
    entry = {
      t: new Date().toISOString(),
      level: levelOrInput,
      tag: (tag || "App").slice(0, 40),
      action: (tag || "App").slice(0, 80),
      detail: String(msg ?? "").slice(0, 800),
    }
  }

  const next = [...readEntries(), entry].slice(-MAX_ENTRIES)
  writeEntries(next)

  const line = `${entry.action}: ${entry.detail}${entry.error ? ` | Fehler: ${entry.error}` : ""}`
  if (entry.level === "error") console.error(`[FdT:${entry.tag}]`, line)
  else if (entry.level === "warn") console.warn(`[FdT:${entry.tag}]`, line)
  else if (typeof console.debug === "function") console.debug(`[FdT:${entry.tag}]`, line)

  notify()
}

/** Eine Zeile für Anzeige/Export. */
export function formatDevLogEntry(e: DevLogEntry): string {
  const parts = [
    e.t,
    e.level.toUpperCase(),
    e.action,
    e.detail,
  ]
  if (e.fn) parts.push(`Funktion: ${e.fn}`)
  if (e.error) parts.push(`Fehler: ${e.error}`)
  return parts.join(" | ")
}

/** Text-Export (lesbar in Editor / Mail). */
export function formatDevLogForExport(entries: DevLogEntry[] = getDevLogEntries()): string {
  const header = [
    "FamiApp Entwickler-Protokoll",
    `Version: ${APP_VERSION.full}`,
    `Exportiert: ${new Date().toISOString()}`,
    `Einträge: ${entries.length}`,
    "",
    "Spalten: Zeit | Stufe | Aktion | Beschreibung | Funktion | Fehler",
    "---",
  ].join("\n")
  const body = entries.map(formatDevLogEntry).join("\n")
  return `${header}\n${body}\n`
}

export function buildDevLogSnapshot(): DevLogSnapshot {
  return {
    type: "dev-log",
    version: APP_VERSION.full,
    exportedAt: new Date().toISOString(),
    enabled: isDevLogEnabled(),
    entries: getDevLogEntries(),
  }
}

export function restoreDevLogFromSnapshot(
  raw: unknown,
  mode: "replace" | "merge" = "replace",
): { ok: boolean; count: number; error?: string } {
  try {
    if (!raw || typeof raw !== "object") {
      return { ok: false, count: 0, error: "invalid" }
    }
    const obj = raw as Record<string, unknown>
    const list = Array.isArray(obj.entries) ? obj.entries : Array.isArray(raw) ? raw : null
    if (!list) return { ok: false, count: 0, error: "no_entries" }

    const incoming = list.map(normalizeEntry).filter((x): x is DevLogEntry => x != null)
    const next =
      mode === "merge"
        ? [...readEntries(), ...incoming].slice(-MAX_ENTRIES)
        : incoming.slice(-MAX_ENTRIES)

    writeEntries(next)

    if (typeof obj.enabled === "boolean") {
      setDeviceKvSync(ENABLED_KEY, obj.enabled ? "1" : "0")
    }

    notify()
    return { ok: true, count: next.length }
  } catch (e) {
    return { ok: false, count: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

export function extractDevLogFromBackup(backup: unknown): unknown | null {
  if (!backup || typeof backup !== "object") return null
  const b = backup as Record<string, unknown>
  if (b.developerLog) return b.developerLog
  if (b.type === "dev-log") return b
  return null
}
