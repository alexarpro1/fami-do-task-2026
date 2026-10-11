"use client"

import { useEffect, useRef } from "react"
import { useFamily } from "@/context/family-context"
import { writeDailyBackupIfDue } from "@/lib/daily-backup"
import { isNativeApp } from "@/lib/device"

/**
 * Läuft einmal nach dem Laden des States: prüft, ob tägliches Backup aktiv ist
 * und ob das letzte Backup älter als 24h – dann wird ein neues Backup geschrieben.
 */
export function DailyBackupRunner() {
  const { state } = useFamily()
  const stateRef = useRef(state)
  const didRun = useRef(false)
  stateRef.current = state

  useEffect(() => {
    if (typeof window === "undefined" || !isNativeApp()) return
    const t = window.setTimeout(() => {
      if (didRun.current) return
      didRun.current = true
      writeDailyBackupIfDue(stateRef.current)
        .then(({ written }) => {
          if (written) console.log("[DailyBackupRunner] Tägliches Backup geschrieben.")
        })
        .catch((e) => console.warn("[DailyBackupRunner]", e))
    }, 2000)
    return () => clearTimeout(t)
  }, [])

  return null
}
