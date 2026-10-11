/**
 * sync-v2 – Update-Check ueber version.json (GitHub Releases).
 * Native: CapacitorHttp (kein CORS). Browser: Asset-URL, Fallback GitHub API.
 */

import type { UpdateCheckAdapter } from "./types"
import type { RemoteVersion } from "../types"
import { APP_UPDATE_DOWNLOAD_URL } from "@/lib/version"
import { fetchJsonSecure } from "@/lib/secure-json-fetch"
import {
  DEFAULT_GITHUB_APK_URL,
  GITHUB_UPDATE_OWNER,
  GITHUB_UPDATE_REPO,
  getVersionCheckUrl,
  isAllowedUpdateUrl,
  parseRemoteVersionManifest,
  resolveSafeApkDownloadUrl,
  sanitizeDownloadUrl,
} from "@/lib/update-security"

function isLocalDevVersionUrl(url: string): boolean {
  if (typeof window === "undefined") return false
  if (url.startsWith("/")) return true
  try {
    const u = new URL(url, window.location.origin)
    return u.origin === window.location.origin
  } catch {
    return false
  }
}

function toRemote(parsed: {
  major: number
  minor: number
  patch: number
  build: number
  apkUrl?: string
  apkSha256?: string
  publishedAt?: string
}): RemoteVersion {
  return {
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch,
    build: parsed.build,
    apkUrl: parsed.apkUrl,
    apkSha256: parsed.apkSha256,
    publishedAt: parsed.publishedAt,
  }
}

/** Browser-CORS-Fallback: Releases-API (api.github.com erlaubt CORS). */
async function fetchFromGithubReleasesApi(): Promise<RemoteVersion | null> {
  const apiUrl = `https://api.github.com/repos/${GITHUB_UPDATE_OWNER}/${GITHUB_UPDATE_REPO}/releases/latest`
  if (!isAllowedUpdateUrl(apiUrl)) return null
  const data = await fetchJsonSecure(apiUrl)
  if (!data || typeof data !== "object") return null
  const row = data as {
    tag_name?: string
    name?: string
    body?: string
    published_at?: string
    assets?: Array<{ name?: string; browser_download_url?: string }>
  }
  const versionMatch = `${row.tag_name || ""} ${row.name || ""}`.match(
    /(\d+)\.(\d+)\.(\d+)\.(\d+)/,
  )
  if (!versionMatch) return null

  const assets = Array.isArray(row.assets) ? row.assets : []
  const apkAsset = assets.find((a) => a.name === "FamiApp-latest.apk")
  const apkUrl =
    sanitizeDownloadUrl(apkAsset?.browser_download_url) ?? DEFAULT_GITHUB_APK_URL

  const shaMatch = (row.body || "").match(/\b([a-f0-9]{64})\b/i)
  const apkSha256 = shaMatch?.[1]?.toLowerCase()

  return toRemote({
    major: parseInt(versionMatch[1]!, 10),
    minor: parseInt(versionMatch[2]!, 10),
    patch: parseInt(versionMatch[3]!, 10),
    build: parseInt(versionMatch[4]!, 10),
    apkUrl,
    apkSha256,
    publishedAt: row.published_at,
  })
}

export function createStaticVersionAdapter(): UpdateCheckAdapter {
  let lastApkUrl: string | null = null

  return {
    async getRemoteVersion(): Promise<RemoteVersion | null> {
      try {
        const url = getVersionCheckUrl()
        if (!isLocalDevVersionUrl(url) && !isAllowedUpdateUrl(url)) {
          return null
        }

        const data = await fetchJsonSecure(url)
        const parsed = parseRemoteVersionManifest(data)
        if (parsed) {
          lastApkUrl = parsed.apkUrl ?? null
          return toRemote(parsed)
        }

        // Browser: Release-Asset oft ohne CORS -> API-Fallback
        const apiRemote = await fetchFromGithubReleasesApi()
        if (apiRemote) {
          lastApkUrl = apiRemote.apkUrl ?? null
          return apiRemote
        }

        // Dev/PWA: lokale public/version.json (same-origin), wenn Remote noch fehlt
        if (typeof window !== "undefined") {
          const localUrl = `${window.location.origin}/version.json`
          const localData = await fetchJsonSecure(localUrl)
          const localParsed = parseRemoteVersionManifest(localData)
          if (localParsed) {
            lastApkUrl = localParsed.apkUrl ?? null
            return toRemote(localParsed)
          }
        }
        return null
      } catch {
        return null
      }
    },
    getUpdateUrl(): string | null {
      return resolveSafeApkDownloadUrl(lastApkUrl, APP_UPDATE_DOWNLOAD_URL)
    },
  }
}
