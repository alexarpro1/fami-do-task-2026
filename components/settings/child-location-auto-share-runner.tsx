"use client"

import { useEffect, useRef } from "react"
import { useFamily } from "@/context/family-context"
import { useDeviceRole } from "@/hooks/useDeviceRole"
import { useSyncId } from "@/hooks/useSyncId"
import { getDeviceId } from "@/hooks/useSyncSession"
import type { FamilyState } from "@/types"
import {
  applyChildLocationToState,
  captureChildLocation,
  clampChildLocationAutoShareIntervalMinutes,
  clampChildLocationLiveIntervalSeconds,
  isChildLocationAutoShareDue,
} from "@/lib/child-location-share"

function resolveAutoShareChildId(state: FamilyState): string | null {
  const children = state.children ?? []
  let id = state.selectedChildId
  if (!id && children.length === 1) id = children[0].id
  return id
}

/**
 * Schreibt in konfigurierbaren Abständen den Standort ins Kind-Profil (nur Geräterolle „Kind“).
 * Fordert auf Android Hintergrund-Standort an (Play: „Immer erlauben“), damit Ortung
 * auch bei Bildschirm aus / App im Hintergrund möglich ist (sofern OS erlaubt).
 */
export function ChildLocationAutoShareRunner() {
  const { state, dispatch } = useFamily()
  const { syncId } = useSyncId()
  const [role, , roleHydrated] = useDeviceRole()
  const stateRef = useRef(state)
  stateRef.current = state
  const inFlightRef = useRef(false)
  const bgPermAskedRef = useRef(false)

  const autoEnabled = state.settings.childLocationAutoShareEnabled !== false
  const liveEnabled = state.settings.childLocationLiveEnabled === true
  const intervalMin = clampChildLocationAutoShareIntervalMinutes(
    state.settings.childLocationAutoShareIntervalMinutes ?? 30,
  )
  const liveIntervalSec = clampChildLocationLiveIntervalSeconds(
    state.settings.childLocationLiveIntervalSeconds ?? 15,
  )

  useEffect(() => {
    if (typeof window === "undefined" || !roleHydrated || role !== "child") return
    if (!autoEnabled) return
    if (!bgPermAskedRef.current) {
      bgPermAskedRef.current = true
      void import("@/lib/device-access-prompts")
        .then(({ promptBackgroundLocationAccess }) => promptBackgroundLocationAccess())
        .catch(() => {})
    }

    const run = async (source: "interval" | "live" | "manual" = liveEnabled ? "live" : "interval") => {
      if (inFlightRef.current) return
      const s = stateRef.current
      const resetGpsFeedbackWarningState = () => {
        dispatch({
          type: "UPDATE_SETTINGS",
          payload: {
            childLocationGpsFailureCount: 0,
            childLocationGpsWarningCount: 0,
            childLocationGpsWarningActive: false,
            childLocationGpsWarningSticky: false,
            childLocationGpsLastFailureAt: undefined,
            childLocationLastUnackedSendId: undefined,
          },
        })
      }
      if (s.settings.childLocationAutoShareEnabled === false) {
        // Master hat Auto-Share deaktiviert: Warnzustand komplett zurücksetzen.
        if (
          s.settings.childLocationGpsWarningActive ||
          (s.settings.childLocationGpsFailureCount ?? 0) > 0 ||
          (s.settings.childLocationGpsWarningCount ?? 0) > 0 ||
          !!s.settings.childLocationLastUnackedSendId
        ) {
          resetGpsFeedbackWarningState()
        }
        return
      }

      const minutes = clampChildLocationAutoShareIntervalMinutes(
        s.settings.childLocationAutoShareIntervalMinutes ?? 30,
      )
      const isLiveOn = s.settings.childLocationLiveEnabled === true
      const childId = resolveAutoShareChildId(s)
      if (!childId) return

      const child = (s.children ?? []).find((c) => c.id === childId)
      const loc = child?.lastSharedLocation

      // Echtes Empfangsfeedback: ACK von Eltern-/Master-Gerät setzt Warnstatus zuverlässig zurück.
      if (
        loc?.ackedAt &&
        (s.settings.childLocationGpsWarningActive ||
          (s.settings.childLocationGpsFailureCount ?? 0) > 0 ||
          (s.settings.childLocationGpsWarningCount ?? 0) > 0 ||
          !!s.settings.childLocationLastUnackedSendId)
      ) {
        resetGpsFeedbackWarningState()
      }

      // Pro gesendeter Location (sendId) nur einmal als "kein Empfangsfeedback" zählen.
      if (loc?.sendId && !loc.ackedAt && s.settings.childLocationLastUnackedSendId !== loc.sendId) {
        const prevFailureCount = s.settings.childLocationGpsFailureCount ?? 0
        const nextFailureCount = prevFailureCount + 1
        const shouldWarnNow = nextFailureCount >= 2
        const prevWarningCount = s.settings.childLocationGpsWarningCount ?? 0
        const nextWarningCount = shouldWarnNow ? prevWarningCount + 1 : prevWarningCount
        const sticky = nextWarningCount >= 3

        dispatch({
          type: "UPDATE_SETTINGS",
          payload: {
            childLocationGpsFailureCount: nextFailureCount,
            childLocationGpsWarningCount: nextWarningCount,
            childLocationGpsWarningActive: shouldWarnNow,
            childLocationGpsWarningSticky: sticky || (s.settings.childLocationGpsWarningSticky ?? false),
            childLocationGpsLastFailureAt: new Date().toISOString(),
            childLocationLastUnackedSendId: loc.sendId,
          },
        })
      }

      if (!isLiveOn && source !== "manual" && !isChildLocationAutoShareDue(child?.lastSharedLocation, minutes)) {
        return
      }

      inFlightRef.current = true
      try {
        const loc = await captureChildLocation()
        const result = applyChildLocationToState(dispatch, childId, loc, source, child?.locationHistory)
        const stored = result.location
        if (typeof window !== "undefined" && syncId && stored.sendId) {
          window.dispatchEvent(
            new CustomEvent("famiapp:live-location-outgoing", {
              detail: {
                syncId,
                childId,
                deviceId: getDeviceId() || undefined,
                sendId: stored.sendId,
                lat: stored.lat,
                lon: stored.lon,
                accuracyM: stored.accuracyM,
                sentAt: stored.sentAt,
                source: stored.source,
                recordedAt: stored.recordedAt,
              },
            }),
          )
        }
      } catch {
        // Sicherheitsregel:
        // - Warnung basiert NUR auf fehlendem erfolgreichen Sende-Feedback
        // - ab 2 fehlenden Feedbacks Warnung aktivieren
        // - wenn Warnung 3x ignoriert (weitere fehlende Feedbacks), Warnung dauerhaft bis wieder erfolgreich gesendet
        const prevFailureCount = s.settings.childLocationGpsFailureCount ?? 0
        const nextFailureCount = prevFailureCount + 1
        const shouldWarnNow = nextFailureCount >= 2
        const prevWarningCount = s.settings.childLocationGpsWarningCount ?? 0
        const nextWarningCount = shouldWarnNow ? prevWarningCount + 1 : prevWarningCount
        const sticky = nextWarningCount >= 3

        dispatch({
          type: "UPDATE_SETTINGS",
          payload: {
            childLocationGpsFailureCount: nextFailureCount,
            childLocationGpsWarningCount: nextWarningCount,
            childLocationGpsWarningActive: shouldWarnNow,
            childLocationGpsWarningSticky: sticky || (s.settings.childLocationGpsWarningSticky ?? false),
            childLocationGpsLastFailureAt: new Date().toISOString(),
            childLocationLastUnackedSendId: s.settings.childLocationLastUnackedSendId,
          },
        })
      } finally {
        inFlightRef.current = false
      }
    }

    const s = stateRef.current.settings
    const seconds = clampChildLocationLiveIntervalSeconds(s.childLocationLiveIntervalSeconds ?? 15)
    const minutes = clampChildLocationAutoShareIntervalMinutes(s.childLocationAutoShareIntervalMinutes ?? 30)
    const periodMs = s.childLocationLiveEnabled === true ? seconds * 1000 : minutes * 60 * 1000

    const startup = window.setTimeout(() => {
      void run(stateRef.current.settings.childLocationLiveEnabled === true ? "live" : "interval")
    }, 5000)

    const intervalId = window.setInterval(() => {
      void run(stateRef.current.settings.childLocationLiveEnabled === true ? "live" : "interval")
    }, periodMs)

    const onManualSend = () => {
      const cfg = stateRef.current.settings
      if (cfg.childLocationLiveManualSendEnabled === false) return
      void run("manual")
    }
    window.addEventListener("famiapp:location-live-send-now", onManualSend as EventListener)

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void run(stateRef.current.settings.childLocationLiveEnabled === true ? "live" : "interval")
      }
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      window.clearTimeout(startup)
      window.clearInterval(intervalId)
      window.removeEventListener("famiapp:location-live-send-now", onManualSend as EventListener)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [role, roleHydrated, dispatch, autoEnabled, intervalMin, liveEnabled, liveIntervalSec, syncId])

  return null
}
