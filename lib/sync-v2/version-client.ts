/**
 * sync-v2 – Version-Check über UpdateCheckAdapter.
 */

import { APP_VERSION, parseVersionString } from "@/lib/version"
import type { UpdateCheckAdapter } from "./adapters/types"
import type { RemoteVersion } from "./types"

export function isNewerVersion(remote: RemoteVersion): boolean {
  if (remote.major > APP_VERSION.major) return true
  if (remote.major < APP_VERSION.major) return false
  if (remote.minor > APP_VERSION.minor) return true
  if (remote.minor < APP_VERSION.minor) return false
  if (remote.patch > APP_VERSION.patch) return true
  if (remote.patch < APP_VERSION.patch) return false
  if (remote.build > APP_VERSION.build) return true
  return false
}

/** Prüft, ob die übergebene Versions-Zeichenkette neuer als die aktuelle APP_VERSION ist. */
export function isRemoteVersionNewer(remoteVersionString: string): boolean {
  const parsed = parseVersionString(remoteVersionString)
  return parsed != null && isNewerVersion(parsed)
}

export interface UpdateInfo {
  available: boolean
  remote: RemoteVersion | null
  label: string
  updateUrl: string | null
}

/** Custom-Event-Name für manuellen Update-Check (VersionBadge → UpdateAvailableBanner). */
export const MANUAL_UPDATE_CHECK_EVENT = "famiapp-check-update"

export async function getUpdateInfo(
  adapter: UpdateCheckAdapter,
): Promise<UpdateInfo> {
  const remote = await adapter.getRemoteVersion()
  const updateUrl = adapter.getUpdateUrl?.() ?? null
  const label =
    remote != null
      ? `V${remote.major}.${remote.minor}.${remote.patch}.${remote.build}`
      : ""
  return {
    available: remote != null && isNewerVersion(remote),
    remote,
    label,
    updateUrl,
  }
}
