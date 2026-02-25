"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { PowerSyncDatabase } from "@powersync/web"
import { setupPowerSync } from "@/lib/db/setup"
import { Spinner } from "@/components/ui/spinner"

const PowerSyncContext = createContext<PowerSyncDatabase | null>(null)

/**
 * Hook: PowerSync-Datenbankinstanz aus dem Context.
 * Gibt null zurück, wenn der Provider noch nicht fertig geladen hat oder außerhalb des Providers verwendet wird.
 */
export function usePowerSync(): PowerSyncDatabase | null {
  return useContext(PowerSyncContext)
}

/**
 * Optional: Lade- und Fehlerzustand für die PowerSync-Initialisierung.
 */
export function usePowerSyncStatus(): {
  isLoading: boolean
  error: Error | null
  db: PowerSyncDatabase | null
} {
  const db = usePowerSync()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    let cancelled = false
    setError(null)
    setIsLoading(true)
    setupPowerSync()
      .then((instance) => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)))
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { isLoading, error, db }
}

type PowerSyncProviderProps = {
  children: React.ReactNode
  /** Optional: Komponente, die angezeigt wird, solange die DB lädt (z. B. Spinner). */
  fallback?: React.ReactNode
}

const defaultFallback = (
  <div className="flex min-h-[4rem] items-center justify-center text-muted-foreground" aria-busy="true">
    <Spinner className="size-6" />
    <span className="sr-only">Datenbank wird geladen…</span>
  </div>
)

/**
 * Provider für die PowerSync-Datenbank. Initialisiert die DB erst nach dem Mount im Browser,
 * um SSR/Build-Fehler mit @powersync/web und wa-sqlite zu vermeiden.
 */
export function PowerSyncProvider({ children, fallback = defaultFallback }: PowerSyncProviderProps) {
  const [powerSync, setPowerSync] = useState<PowerSyncDatabase | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    let cancelled = false
    setupPowerSync()
      .then((db) => {
        if (!cancelled) setPowerSync(db)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)))
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 text-destructive" role="alert">
        <span>PowerSync konnte nicht geladen werden: {error.message}</span>
      </div>
    )
  }

  if (powerSync == null) {
    return <>{fallback}</>
  }

  return (
    <PowerSyncContext.Provider value={powerSync}>
      {children}
    </PowerSyncContext.Provider>
  )
}
