/**
 * sync-v2 – Update-Check über statische version.json-URL.
 */

import type { UpdateCheckAdapter } from "./types"
import type { RemoteVersion } from "../types"

function getVersionUrl(): string {
  const base =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_VERSION_CHECK_URL
      ? String(process.env.NEXT_PUBLIC_VERSION_CHECK_URL).replace(/\/$/, "")
      : typeof window !== "undefined"
        ? window.location.origin
        : ""
  return `${base}/version.json`
}

export function createStaticVersionAdapter(): UpdateCheckAdapter {
  return {
    async getRemoteVersion(): Promise<RemoteVersion | null> {
      try {
        const url = getVersionUrl()
        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok) return null
        const data = await res.json()
        if (
          data &&
          typeof data.major === "number" &&
          typeof data.build === "number"
        ) {
          return {
            major: data.major,
            minor: data.minor ?? 0,
            patch: data.patch ?? 0,
            build: data.build ?? 0,
          }
        }
        return null
      } catch {
        return null
      }
    },
    getUpdateUrl(): string | null {
      if (typeof window !== "undefined") return window.location.origin
      const base =
        typeof process !== "undefined" && process.env.NEXT_PUBLIC_VERSION_CHECK_URL
          ? process.env.NEXT_PUBLIC_VERSION_CHECK_URL
          : ""
      return base || null
    },
  }
}
