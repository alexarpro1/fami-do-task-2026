"use client"

import type { Dispatch } from "react"
import type { Child, FamilyAction } from "@/types"
import { isNativeApp } from "@/lib/device"
import { appendLocationHistoryEntry } from "@/lib/location/location-history"

export type SharedChildLocation = NonNullable<
  import("@/types").Child["lastSharedLocation"]
>

export type ChildLocationFailureReason = "permission_denied" | "gps_disabled" | "unavailable" | "unknown"

function createLocationSendId(): string {
  return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** Auswahl für Einstellungen (Minuten) */
export const CHILD_LOCATION_AUTO_SHARE_INTERVAL_OPTIONS = [
  5, 10, 15, 20, 30, 45, 60, 90, 120, 180,
] as const

export function clampChildLocationAutoShareIntervalMinutes(n: number): number {
  const x = Math.round(Number(n))
  if (!Number.isFinite(x)) return 30
  return Math.min(180, Math.max(5, x))
}

export function clampChildLocationLiveIntervalSeconds(n: number): number {
  const x = Math.round(Number(n))
  if (!Number.isFinite(x)) return 15
  return Math.min(120, Math.max(5, x))
}

/** Ob seit dem letzten Eintrag mindestens das Intervall vergangen ist (für Auto-Share). */
export function isChildLocationAutoShareDue(
  last: import("@/types").Child["lastSharedLocation"],
  intervalMinutes: number,
): boolean {
  const ms = clampChildLocationAutoShareIntervalMinutes(intervalMinutes) * 60 * 1000
  if (!last?.recordedAt) return true
  return Date.now() - new Date(last.recordedAt).getTime() >= ms
}

function browserLocationWithMeta(recordedAt: string): Promise<SharedChildLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation nicht verfügbar"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const acc = pos.coords.accuracy
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: acc != null && Number.isFinite(acc) ? Math.round(acc) : undefined,
          recordedAt,
        })
      },
      reject,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  })
}

/**
 * Aktuelle Position mit optionaler Genauigkeit (Capacitor auf Native, sonst Browser-GPS).
 */
export async function captureChildLocation(): Promise<SharedChildLocation> {
  if (typeof window === "undefined") {
    throw new Error("Standort nur im Client verfügbar")
  }

  const recordedAt = new Date().toISOString()

  if (isNativeApp()) {
    try {
      // Android: nativer Dialog inkl. Möglichkeit auf Hintergrund-Standort
      try {
        const { promptBackgroundLocationAccess } = await import("@/lib/device-access-prompts")
        await promptBackgroundLocationAccess()
      } catch {
        // weiter mit Capacitor Geolocation
      }
      const { Geolocation } = await import("@capacitor/geolocation")
      let perm = await Geolocation.checkPermissions()
      if (perm.location !== "granted") {
        perm = await Geolocation.requestPermissions()
      }
      if (perm.location !== "granted") {
        throw new Error("LOCATION_DENIED")
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      })
      const acc = position.coords.accuracy
      return {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracyM: acc != null && Number.isFinite(acc) ? Math.round(acc) : undefined,
        recordedAt,
      }
    } catch {
      // Fallback Browser-API (z. B. fehlende Play-Services oder WebView)
    }
  }

  return browserLocationWithMeta(recordedAt)
}

export function classifyChildLocationFailure(error: unknown): ChildLocationFailureReason {
  if (!error) return "unknown"

  const maybeCode = (error as { code?: unknown }).code
  const maybeMessage = String((error as { message?: unknown }).message ?? "").toLowerCase()

  // Browser Geolocation codes: 1=permission denied, 2=position unavailable.
  if (maybeCode === 1) return "permission_denied"
  if (maybeCode === 2) return "unavailable"

  if (maybeMessage.includes("location_denied") || maybeMessage.includes("permission denied")) {
    return "permission_denied"
  }
  if (
    maybeMessage.includes("location services are disabled") ||
    maybeMessage.includes("location disabled") ||
    maybeMessage.includes("gps") ||
    maybeMessage.includes("location settings")
  ) {
    return "gps_disabled"
  }
  if (maybeMessage.includes("position unavailable") || maybeMessage.includes("timeout")) {
    return "unavailable"
  }

  return "unknown"
}

export function applyChildLocationToState(
  dispatch: Dispatch<FamilyAction>,
  childId: string,
  location: SharedChildLocation,
  source: SharedChildLocation["source"] = "interval",
  currentHistory?: Child["locationHistory"],
): { location: SharedChildLocation; history: NonNullable<Child["locationHistory"]> } {
  const sentAt = new Date().toISOString()
  const nextLocation: SharedChildLocation = {
    ...location,
    sentAt,
    source,
    sendId: createLocationSendId(),
    ackedAt: undefined,
    ackedByRole: undefined,
    ackedByDeviceId: undefined,
  }
  const nextHistory = appendLocationHistoryEntry(currentHistory, {
    sendId: nextLocation.sendId,
    lat: nextLocation.lat,
    lon: nextLocation.lon,
    accuracyM: nextLocation.accuracyM,
    recordedAt: nextLocation.recordedAt,
    sentAt: nextLocation.sentAt,
    source: nextLocation.source,
  })
  dispatch({
    type: "UPDATE_CHILD",
    payload: {
      id: childId,
      updates: {
        lastSharedLocation: nextLocation,
        locationHistory: nextHistory,
      },
    },
  })
  return { location: nextLocation, history: nextHistory }
}
