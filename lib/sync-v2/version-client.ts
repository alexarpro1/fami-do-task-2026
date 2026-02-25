/**
 * sync-v2 – Version-Check über UpdateCheckAdapter.
 */

import { APP_VERSION } from "@/lib/version"
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

export interface UpdateInfo {
  available: boolean
  remote: RemoteVersion | null
  label: string
  updateUrl: string | null
}

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
