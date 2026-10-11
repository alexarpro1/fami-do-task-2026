/**
 * JSON-GET: CapacitorHttp auf Native (kein CORS), fetch im Browser.
 */

import { Capacitor, CapacitorHttp } from "@capacitor/core"
import { isCapacitorNativeShell } from "@/lib/device"

function resolveRequestUrl(url: string): string {
  if (typeof window === "undefined") return url
  if (url.startsWith("/")) return `${window.location.origin}${url}`
  try {
    return new URL(url, window.location.origin).href
  } catch {
    return url
  }
}

function parseJsonBody(data: unknown): unknown {
  if (data == null) return null
  if (typeof data === "object") return data
  if (typeof data === "string") {
    const trimmed = data.trim()
    if (!trimmed) return null
    return JSON.parse(trimmed)
  }
  return null
}

export async function fetchJsonSecure(url: string): Promise<unknown> {
  const resolved = resolveRequestUrl(url)

  if (isCapacitorNativeShell() && Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({
      url: resolved,
      headers: { Accept: "application/json" },
      connectTimeout: 20000,
      readTimeout: 20000,
    })
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`HTTP ${res.status}`)
    }
    return parseJsonBody(res.data)
  }

  const res = await fetch(resolved, {
    method: "GET",
    credentials: "omit",
    headers: { Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
