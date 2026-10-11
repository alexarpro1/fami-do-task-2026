/**
 * Sichere Remote-Update-Quellen: HTTPS-only, Host-Allowlist, Manifest-Parse.
 * Kein Trust in beliebige Supabase-/Drive-Download-URLs.
 */

/** GitHub owner/repo aus Remote (Defaults fuer Releases). */
export const GITHUB_UPDATE_OWNER = "alexarpro1"
export const GITHUB_UPDATE_REPO = "fami-do-task-2026"

export const DEFAULT_GITHUB_APK_URL =
  `https://github.com/${GITHUB_UPDATE_OWNER}/${GITHUB_UPDATE_REPO}/releases/latest/download/FamiApp-latest.apk`

export const DEFAULT_GITHUB_VERSION_CHECK_URL =
  `https://github.com/${GITHUB_UPDATE_OWNER}/${GITHUB_UPDATE_REPO}/releases/latest/download/version.json`

/** Feste Default-Hosts; zusaetzlich NEXT_PUBLIC_UPDATE_ALLOWED_HOSTS (kommagetrennt). */
export const DEFAULT_UPDATE_ALLOWED_HOSTS = [
  "github.com",
  "api.github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
] as const

export interface RemoteVersionManifest {
  major: number
  minor: number
  patch: number
  build: number
  apkUrl?: string
  apkSha256?: string
  publishedAt?: string
  version?: string
  lastUpdated?: string
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^\.+/, "")
}

/** Allowlist der erlaubten Update-Hosts (Check + Download). */
export function getAllowedUpdateHosts(): string[] {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_UPDATE_ALLOWED_HOSTS
      ? String(process.env.NEXT_PUBLIC_UPDATE_ALLOWED_HOSTS)
          .split(",")
          .map(normalizeHost)
          .filter(Boolean)
      : []
  const set = new Set<string>([...DEFAULT_UPDATE_ALLOWED_HOSTS, ...fromEnv])
  return [...set]
}

function hostMatchesAllowlist(hostname: string, allowed: string[]): boolean {
  const host = normalizeHost(hostname)
  return allowed.some((entry) => {
    const a = normalizeHost(entry)
    return host === a || host.endsWith(`.${a}`)
  })
}

/**
 * Nur HTTPS + Allowlist-Host. http:// und fremde Hosts werden abgelehnt.
 */
export function isAllowedUpdateUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false
  const trimmed = url.trim()
  if (!trimmed) return false
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }
  if (parsed.protocol !== "https:") return false
  if (parsed.username || parsed.password) return false
  return hostMatchesAllowlist(parsed.hostname, getAllowedUpdateHosts())
}

/** Gibt die URL zurueck wenn allowlisted, sonst null. */
export function sanitizeDownloadUrl(url: string | null | undefined): string | null {
  if (!isAllowedUpdateUrl(url)) return null
  return String(url).trim()
}

/**
 * VERSION_CHECK_URL darf Basis-URL oder volle .../version.json sein.
 * Verhindert doppeltes /version.json-Suffix.
 */
export function resolveVersionCheckUrl(baseOrFull: string | null | undefined): string {
  const raw = (baseOrFull ?? "").trim()
  if (!raw) return DEFAULT_GITHUB_VERSION_CHECK_URL
  const withoutTrailingSlash = raw.replace(/\/+$/, "")
  if (/\/version\.json$/i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash
  }
  return `${withoutTrailingSlash}/version.json`
}

/** Kanonische Check-URL aus Env oder GitHub-Default. */
export function getVersionCheckUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_VERSION_CHECK_URL
      ? String(process.env.NEXT_PUBLIC_VERSION_CHECK_URL)
      : ""
  return resolveVersionCheckUrl(fromEnv || DEFAULT_GITHUB_VERSION_CHECK_URL)
}

const SHA256_HEX = /^[a-f0-9]{64}$/i

/**
 * Parst Remote-version.json; bei ungueltigem Schema null.
 * apkUrl nur behalten wenn Allowlist-Match.
 */
export function parseRemoteVersionManifest(data: unknown): RemoteVersionManifest | null {
  if (!data || typeof data !== "object") return null
  const row = data as Record<string, unknown>
  const major = typeof row.major === "number" ? row.major : Number(row.major)
  const build = typeof row.build === "number" ? row.build : Number(row.build)
  if (!Number.isFinite(major) || !Number.isFinite(build)) return null
  if (major < 0 || build < 0) return null

  const minor = typeof row.minor === "number" ? row.minor : Number(row.minor ?? 0)
  const patch = typeof row.patch === "number" ? row.patch : Number(row.patch ?? 0)
  if (!Number.isFinite(minor) || !Number.isFinite(patch) || minor < 0 || patch < 0) return null

  const apkUrlRaw = typeof row.apkUrl === "string" ? row.apkUrl.trim() : ""
  const apkUrl = sanitizeDownloadUrl(apkUrlRaw) ?? undefined

  const apkSha256Raw = typeof row.apkSha256 === "string" ? row.apkSha256.trim() : ""
  const apkSha256 = SHA256_HEX.test(apkSha256Raw) ? apkSha256Raw.toLowerCase() : undefined

  const publishedAt =
    typeof row.publishedAt === "string"
      ? row.publishedAt
      : typeof row.lastUpdated === "string"
        ? row.lastUpdated
        : undefined

  const version = typeof row.version === "string" ? row.version : undefined

  return {
    major,
    minor,
    patch,
    build,
    apkUrl,
    apkSha256,
    publishedAt,
    version,
  }
}

/** Sichere Download-URL: Allowlist-Kandidat oder GitHub-Default. */
export function resolveSafeApkDownloadUrl(
  ...candidates: Array<string | null | undefined>
): string {
  for (const c of candidates) {
    const safe = sanitizeDownloadUrl(c)
    if (safe) return safe
  }
  return DEFAULT_GITHUB_APK_URL
}

function openSafeUpdateUrlOnce(safe: string): boolean {
  const cap =
    typeof window !== "undefined"
      ? (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      : undefined
  if (cap?.isNativePlatform?.()) {
    return false
  }
  if (typeof window !== "undefined") {
    window.open(safe, "_blank", "noopener,noreferrer")
    return true
  }
  return false
}

/** Oeffnet eine allowlisted Update-URL (Capacitor Browser auf APK, sonst window.open). */
export async function openSafeUpdateUrl(
  url: string | null | undefined,
  options?: { maxAttempts?: number },
): Promise<boolean> {
  const safe = sanitizeDownloadUrl(url) ?? sanitizeDownloadUrl(DEFAULT_GITHUB_APK_URL)
  if (!safe) return false
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 3)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const cap =
        typeof window !== "undefined"
          ? (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
          : undefined
      if (cap?.isNativePlatform?.()) {
        const { Browser } = await import("@capacitor/browser")
        await Browser.open({ url: safe })
        return true
      }
      if (openSafeUpdateUrlOnce(safe)) return true
    } catch {
      // retry
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => window.setTimeout(r, 600 * (attempt + 1)))
    }
  }
  return false
}

export function getGithubReleasePageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/latest\/download\//i,
  )
  if (!match) {
    if (isAllowedUpdateUrl(DEFAULT_GITHUB_APK_URL)) {
      return `https://github.com/${GITHUB_UPDATE_OWNER}/${GITHUB_UPDATE_REPO}/releases/latest`
    }
    return null
  }
  return `https://github.com/${match[1]}/${match[2]}/releases/latest`
}
