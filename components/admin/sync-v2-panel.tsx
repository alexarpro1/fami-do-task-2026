"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { getSyncAdapter, setStoredFamilyCode, type SyncBackendId } from "@/lib/sync-v2/adapters"
import { fullSync, pushOnly, pullOnly } from "@/lib/sync-v2/sync-client"
import { Cloud, Loader2, Upload, Download, RefreshCw } from "lucide-react"

export function SyncV2Panel() {
  const { state, dispatch } = useFamily()
  const { toast } = useToast()
  const [backend, setBackend] = useState<SyncBackendId>("supabase")
  const [familyCode, setFamilyCode] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("famiapp_sync_v2_family_code") ?? "" : "",
  )
  const [loading, setLoading] = useState<"sync" | "push" | "pull" | null>(null)

  const adapter = getSyncAdapter(backend)
  const getFamilyState = () => state

  const handleSaveFamilyCode = () => {
    const code = familyCode.trim().toUpperCase() || "default"
    setStoredFamilyCode(code)
    if (typeof window !== "undefined") {
      localStorage.setItem("famiapp_sync_v2_family_code", code)
    }
    toast({ title: "Familien-Code gespeichert", description: `Code: ${code}` })
  }

  const handleFullSync = async () => {
    if (!adapter) {
      toast({ title: "Kein Backend", description: "Bitte Supabase oder Google Drive wählen und ggf. verbinden.", variant: "destructive" })
      return
    }
    if (backend === "supabase" && familyCode.trim()) {
      const code = familyCode.trim().toUpperCase()
      setStoredFamilyCode(code)
      if (typeof window !== "undefined") localStorage.setItem("famiapp_sync_v2_family_code", code)
    }
    setLoading("sync")
    try {
      const code = familyCode.trim() || undefined
      const result = await fullSync(adapter, getFamilyState, dispatch, code)
      if (result.ok) {
        toast({
          title: "Synchronisierung erfolgreich",
          description: result.pulled ? "Daten hochgeladen und aktualisiert." : "Daten hochgeladen.",
        })
      } else {
        toast({ title: "Sync fehlgeschlagen", description: result.error, variant: "destructive" })
      }
    } finally {
      setLoading(null)
    }
  }

  const handleBackup = async () => {
    if (!adapter) return
    setLoading("push")
    try {
      const code = familyCode.trim() || undefined
      const result = await pushOnly(adapter, getFamilyState, code)
      if (result.ok) {
        toast({ title: "Backup erstellt", description: "Daten wurden in die Cloud hochgeladen." })
      } else {
        toast({ title: "Backup fehlgeschlagen", description: result.error, variant: "destructive" })
      }
    } finally {
      setLoading(null)
    }
  }

  const handleRestore = async () => {
    if (!adapter) return
    setLoading("pull")
    try {
      const result = await pullOnly(adapter, dispatch)
      if (result.ok) {
        toast({
          title: result.pulled ? "Daten wiederhergestellt" : "Keine Cloud-Daten gefunden",
          description: result.pulled ? "Familie und Spiele-Fortschritt wurden geladen." : undefined,
        })
      } else {
        toast({ title: "Wiederherstellung fehlgeschlagen", description: result.error, variant: "destructive" })
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Backup und Sync (sync-v2) mit Supabase oder Google Drive. Synchronisiert Familien-Daten und Spiele-Fortschritt.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Backend</label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={backend === "supabase" ? "default" : "outline"}
            size="sm"
            onClick={() => setBackend("supabase")}
          >
            Supabase
          </Button>
          <Button
            type="button"
            variant={backend === "google-drive" ? "default" : "outline"}
            size="sm"
            onClick={() => setBackend("google-drive")}
          >
            Google Drive
          </Button>
        </div>
      </div>

      {backend === "supabase" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Familien-Code (optional, für Sync zwischen Geräten)</label>
          <div className="flex gap-2">
            <Input
              placeholder="z.B. ABC12XYZ"
              value={familyCode}
              onChange={(e) => setFamilyCode(e.target.value)}
              className="max-w-[180px]"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleSaveFamilyCode}>
              Speichern
            </Button>
          </div>
        </div>
      )}

      {backend === "google-drive" && (
        <p className="text-xs text-muted-foreground">
          Google Drive muss zuerst verbunden werden; danach hier Backup/Sync nutzen.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleFullSync}
          disabled={!adapter || loading !== null}
          className="gap-2"
        >
          {loading === "sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Jetzt synchronisieren
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleBackup}
          disabled={!adapter || loading !== null}
          className="gap-2"
        >
          {loading === "push" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Nur sichern
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleRestore}
          disabled={!adapter || loading !== null}
          className="gap-2"
        >
          {loading === "pull" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Von Cloud laden
        </Button>
      </div>
    </div>
  )
}
