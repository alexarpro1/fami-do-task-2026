/**
 * Sichere Remote-Update-Pruefung (GitHub version.json + optional Supabase Force).
 * Debounce / Persistenz fuer Auto-Check ohne Spam.
 */

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { APP_VERSION, APP_UPDATE_DOWNLOAD_URL } from "@/lib/version"
import { compareVersions } from "@/lib/version-compare"
import { getUpdateCheckAdapter } from "@/lib/sync-v2/adapters"
import { getUpdateInfo } from "@/lib/sync-v2/version-client"
import {
  resolveSafeApkDownloadUrl,
  sanitizeDownloadUrl,
} from "@/lib/update-security"

/** Resume: erneut pruefen wenn letzter Check aelter als 1h. */
export const UPDATE_CHECK_RESUME_MIN_MS = 60 * 60 * 1000
/** Spaetestens alle 24h erneut pruefen (auch ohne Resume). */
export const UPDATE_CHECK_MAX_STALE_MS = 24 * 60 * 60 * 1000

const KEY_LAST_CHECK_AT = "famiapp-update-last-check-at"
const KEY_LAST_NOTIFIED = "famiapp-update-last-notified-version"
const KEY_LAST_AUTO_OPENED = "famiapp-update-last-auto-opened-version"
const KEY_SOFT_DISMISSED = "famiapp-update-soft-prompt-dismissed-version"

export type UpdateCheckReason = "cold" | "resume" | "manual" | "interval"

export interface AppUpdateResult {
  updateAvailable: boolean
  latestVersion: string
  downloadUrl: string
  forceUpdate: boolean
  apkSha256: string
  label: string
  /** true wenn version.json erfolgreich geladen/geparst wurde */
  remoteFetched: boolean
}

export function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore quota
  }
}

export function getLastCheckAt(): number {
  const raw = readStorage(KEY_LAST_CHECK_AT)
  if (!raw) return 0
  const n = Date.parse(raw)
  return Number.isFinite(n) ? n : 0
}

export function markCheckPerformed(at = Date.now()): void {
  writeStorage(KEY_LAST_CHECK_AT, new Date(at).toISOString())
}

/**
 * cold/manual: immer.
 * resume: nur wenn letzter Check > 1h.
 * interval: wenn letzter Check > 24h (oder > 1h als sanfte Nachpruefung bei langer Session).
 */
export function shouldRunUpdateCheck(
  reason: UpdateCheckReason,
  lastCheckAt = getLastCheckAt(),
  now = Date.now(),
): boolean {
  if (reason === "cold" || reason === "manual") return true
  const age = now - lastCheckAt
  if (lastCheckAt <= 0) return true
  if (reason === "resume") return age >= UPDATE_CHECK_RESUME_MIN_MS
  if (reason === "interval") return age >= UPDATE_CHECK_MAX_STALE_MS
  return false
}

export function getLastNotifiedVersion(): string | null {
  return readStorage(KEY_LAST_NOTIFIED)
}

export function markNotifiedVersion(version: string): void {
  writeStorage(KEY_LAST_NOTIFIED, version)
}

export function getLastAutoOpenedVersion(): string | null {
  return readStorage(KEY_LAST_AUTO_OPENED)
}

export function markAutoOpenedVersion(version: string): void {
  writeStorage(KEY_LAST_AUTO_OPENED, version)
}

export function getSoftDismissedVersion(): string | null {
  return readStorage(KEY_SOFT_DISMISSED)
}

export function markSoftDismissedVersion(version: string): void {
  writeStorage(KEY_SOFT_DISMISSED, version)
}

/** Soft-Prompt einmal pro Remote-Version (nicht bei Force). */
export function shouldShowSoftPrompt(result: AppUpdateResult): boolean {
  if (!result.updateAvailable || result.forceUpdate || !result.latestVersion) return false
  const v = result.latestVersion
  if (getSoftDismissedVersion() === v) return false
  if (getLastNotifiedVersion() === v) return false
  return true
}

/** Force: Download einmal pro Remote-Version auto-oeffnen. */
export function shouldAutoOpenForceDownload(result: AppUpdateResult): boolean {
  if (!result.forceUpdate || !result.latestVersion) return false
  return getLastAutoOpenedVersion() !== result.latestVersion
}

/** Remote version.json + optional Supabase Force (Allowlist fuer download_url). */
export async function fetchAppUpdateResult(): Promise<AppUpdateResult> {
  const current = APP_VERSION.full
  let updateAvailable = false
  let latestVersion = ""
  let downloadUrl = APP_UPDATE_DOWNLOAD_URL
  let forceUpdate = false
  let apkSha256 = ""
  let label = ""
  let remoteFetched = false

  try {
    const adapter = getUpdateCheckAdapter()
    const info = await getUpdateInfo(adapter)
    if (info.remote) {
      remoteFetched = true
      latestVersion = `${info.remote.major}.${info.remote.minor}.${info.remote.patch}.${info.remote.build}`
      updateAvailable = info.available
      downloadUrl = resolveSafeApkDownloadUrl(
        info.remote.apkUrl,
        info.updateUrl,
        APP_UPDATE_DOWNLOAD_URL,
      )
      apkSha256 = info.remote.apkSha256 ?? ""
      label = info.label
    }
  } catch {
    // offline
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("app_updates")
        .select("latest_version, force_update, download_url, min_required_version")
        .eq("id", "default")
        .maybeSingle()

      if (!error && data) {
        const row = data as {
          latest_version?: string
          force_update?: boolean
          download_url?: string
          min_required_version?: string
        }
        const sbLatest = (row.latest_version ?? "").trim()
        const minRequired = (row.min_required_version ?? "").trim()
        const sbForceFlag = Boolean(row.force_update)

        if (!latestVersion && sbLatest) {
          latestVersion = sbLatest.replace(/^V/i, "")
        }
        if (sbLatest && compareVersions(current, sbLatest) === -1 && !updateAvailable) {
          updateAvailable = true
          if (!latestVersion) latestVersion = sbLatest.replace(/^V/i, "")
        }

        forceUpdate =
          sbForceFlag ||
          (minRequired.length > 0 && compareVersions(current, minRequired) === -1)

        const safeDbUrl = sanitizeDownloadUrl(row.download_url)
        if (safeDbUrl) downloadUrl = safeDbUrl
      }
    } catch {
      // optional
    }
  }

  if (updateAvailable && latestVersion && !label) {
    label = latestVersion.startsWith("V") ? latestVersion : `V${latestVersion}`
  }

  return {
    updateAvailable,
    latestVersion,
    downloadUrl: resolveSafeApkDownloadUrl(downloadUrl, APP_UPDATE_DOWNLOAD_URL),
    forceUpdate,
    apkSha256,
    label,
    remoteFetched,
  }
}

const RETRY_DELAY_MS = 800

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Update-Check mit Netzwerk-Retry (ErrorBoundary / kaputtes UI).
 * Gibt auch bei Offline das letzte Teilergebnis zurueck.
 */
export async function fetchAppUpdateResultWithRetry(
  maxAttempts = 3,
): Promise<AppUpdateResult> {
  let last: AppUpdateResult | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const next = await fetchAppUpdateResult()
      last = next
      if (next.remoteFetched) return next
    } catch {
      // retry
    }
    if (attempt < maxAttempts - 1) {
      await delay(RETRY_DELAY_MS * (attempt + 1))
    }
  }
  if (last) return last
  return fetchAppUpdateResult()
}
