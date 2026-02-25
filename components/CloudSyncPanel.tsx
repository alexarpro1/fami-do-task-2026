"use client"

import { useEffect, useState } from "react"
import { Cloud, CloudOff, RefreshCw, CheckCircle, Download, Upload, LogOut } from "lucide-react"
import type { Session } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { getPowerSyncInstance } from "@/lib/db/setup"
import { useSyncStatus } from "@/hooks/useSyncStatus"
import { Button } from "@/components/ui/button"
import { FamilyCloudLogin } from "@/components/FamilyCloudLogin"

/**
 * Cloud-Sync-Dashboard: Prüft Supabase-Auth. Ohne Session wird das Login-Formular
 * (FamilyCloudLogin) angezeigt; mit Session der PowerSync-Status inkl. „Ausloggen“.
 */
export function CloudSyncPanel() {
  const [session, setSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null)
      setAuthChecked(true)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const {
    connected,
    connecting,
    downloading,
    uploading,
    lastSyncedAt,
    reconnect,
  } = useSyncStatus()

  const isSynced = connected && !downloading && !uploading && !connecting
  const isOffline = !connected && !connecting
  const isBusy = connecting || downloading || uploading

  const statusLabel = isSynced
    ? "Synchron"
    : connecting
      ? "Verbinde…"
      : downloading
        ? "Lade Daten…"
        : uploading
          ? "Lade hoch…"
          : isOffline
            ? "Offline"
            : "Sync"

  const statusDescription =
    isSynced && lastSyncedAt
      ? `Zuletzt synchron: ${formatLastSynced(lastSyncedAt)}`
      : isOffline
        ? "Keine Verbindung zum Cloud-Sync. Beim nächsten Kontakt wird automatisch synchronisiert."
        : isBusy
          ? "Daten werden mit der Cloud ausgetauscht."
          : ""

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    getPowerSyncInstance()?.disconnect()
  }

  if (!authChecked) {
    return (
      <div className="rounded-2xl border border-border bg-card neu-flat overflow-hidden">
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Lade Cloud-Status…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-border bg-card neu-flat overflow-hidden">
        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-1">Familien-Cloud-Anmeldung</h3>
          <FamilyCloudLogin />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card neu-flat overflow-hidden">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isSynced
                  ? "bg-primary/20 text-primary"
                  : isOffline
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
              }`}
              aria-hidden
            >
              {isSynced ? (
                <CheckCircle className="h-5 w-5" />
              ) : isOffline ? (
                <CloudOff className="h-5 w-5" />
              ) : (
                <Cloud className="h-5 w-5" />
              )}
            </span>
            <div>
              <p className="font-semibold text-foreground">{statusLabel}</p>
              {statusDescription && (
                <p className="text-sm text-muted-foreground">{statusDescription}</p>
              )}
            </div>
          </div>
          {(downloading || uploading) && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {downloading && <Download className="h-4 w-4 animate-pulse" />}
              {uploading && <Upload className="h-4 w-4 animate-pulse" />}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={() => reconnect()}
            disabled={isBusy}
          >
            <RefreshCw className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`} />
            Jetzt synchronisieren
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 rounded-xl text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Ausloggen
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatLastSynced(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60_000)
    if (diffMin < 1) return "gerade eben"
    if (diffMin < 60) return `vor ${diffMin} Min.`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `vor ${diffH} Std.`
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  } catch {
    return iso
  }
}
