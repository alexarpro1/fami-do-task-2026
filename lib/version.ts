// Auto-incrementing build system
// This file is automatically updated on each deployment/build

import {
  DEFAULT_GITHUB_APK_URL,
  getVersionCheckUrl as resolveConfiguredVersionCheckUrl,
  resolveSafeApkDownloadUrl,
} from "@/lib/update-security"

/** Kanonische APK-Download-URL (GitHub Releases). Drive ist kein Default mehr. */
const appUpdateUrlFromEnv =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_UPDATE_DOWNLOAD_URL : undefined

export const APP_UPDATE_DOWNLOAD_URL = resolveSafeApkDownloadUrl(
  appUpdateUrlFromEnv,
  DEFAULT_GITHUB_APK_URL,
)

/** Remote version.json fuer Update-Check (volle URL oder Basis; Adapter haengt nicht doppelt an). */
export const VERSION_CHECK_URL = resolveConfiguredVersionCheckUrl()

/** Angezeigter Entwickler / Publisher der App. */
export const APP_DEVELOPER = "Fenix Web"

export const APP_VERSION = {
  major: 2,
  minor: 6,
  patch: 2,
  build: 1,

  get full(): string {
    return `${this.major}.${this.minor}.${this.patch}.${this.build}`
  },

  get display(): string {
    return `V${this.full}`
  },

  get short(): string {
    return `${this.major}.${this.minor}.${this.patch}`
  },
}

/** Geparste Version (major.minor.patch.build). */
export interface ParsedVersion {
  major: number
  minor: number
  patch: number
  build: number
}

/**
 * Parst Versions-Strings wie "2.6.0.17", "V2.6.0.17" oder "FamiApp V2.6.0.19" / "FamiApp-V2.6.0.18".
 * Sucht nach dem Muster major.minor.patch.build (z. B. 2.6.0.18) und vergleicht damit.
 * Gibt null zurück bei ungültigem Format.
 */
export function parseVersionString(s: string): ParsedVersion | null {
  if (!s || typeof s !== "string") return null
  const match = s.trim().match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  const major = parseInt(match[1]!, 10)
  const minor = parseInt(match[2]!, 10)
  const patch = parseInt(match[3]!, 10)
  const build = parseInt(match[4]!, 10)
  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch) || Number.isNaN(build) || major < 0 || minor < 0 || patch < 0 || build < 0) return null
  return { major, minor, patch, build }
}

// Build info
export const BUILD_INFO = {
  timestamp: new Date("2026-10-11T15:00:00.000Z"),
  get formatted(): string {
    return this.timestamp.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  },
}
