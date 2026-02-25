// Moved from components/family-sync/family-sync-panel.tsx

"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createFamily, joinFamily, syncFamilyData } from "@/beta-archive/lib/family-sync"
import { QRCodeDisplay } from "./qr-code-display"
import { Users, QrCode, Cloud, Check, AlertCircle } from "lucide-react"

export function FamilySyncPanel() {
  const { state, dispatch } = useFamily()
  const [familyCode, setFamilyCode] = useState("")
  const [showQR, setShowQR] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState("")

  const handleCreateFamily = async () => {
    try {
      setSyncing(true)
      setError("")
      const code = await createFamily(state)
      dispatch({
        type: "UPDATE_FAMILY_SYNC",
        payload: {
          ...state.familySync,
          familyCode: code,
          role: "master",
          syncStatus: "synced",
        },
      })
      setShowQR(true)
    } catch (err) {
      setError("Fehler beim Erstellen der Familie")
    } finally {
      setSyncing(false)
    }
  }

  const handleJoinFamily = async () => {
    if (!familyCode) return
    try {
      setSyncing(true)
      setError("")
      const familyData = await joinFamily(familyCode, state.familySync.deviceId)
      dispatch({ type: "LOAD_STATE", payload: familyData })
      dispatch({
        type: "UPDATE_FAMILY_SYNC",
        payload: {
          ...state.familySync,
          familyCode,
          role: "admin",
          syncStatus: "synced",
        },
      })
    } catch (err) {
      setError("Ungültiger Familiencode")
    } finally {
      setSyncing(false)
    }
  }

  const handleManualSync = async () => {
    if (!state.familySync.familyCode) return
    try {
      setSyncing(true)
      await syncFamilyData(state)
      dispatch({
        type: "UPDATE_FAMILY_SYNC",
        payload: { ...state.familySync, syncStatus: "synced", lastSyncedAt: new Date().toISOString() },
      })
    } catch (err) {
      setError("Sync fehlgeschlagen")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      {!state.familySync.familyCode ? (
        <>
          <div className="p-4 rounded-xl bg-secondary/50">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Familie erstellen
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Erstelle eine Familie und teile den Code mit anderen Geräten
            </p>
            <Button onClick={handleCreateFamily} disabled={syncing} className="w-full rounded-xl">
              Familie erstellen
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-secondary/50">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Familie beitreten
            </h4>
            <p className="text-sm text-muted-foreground mb-3">Gib den Familiencode ein um beizutreten</p>
            <div className="flex gap-2">
              <Input
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value)}
                placeholder="Familiencode"
                className="rounded-xl"
              />
              <Button onClick={handleJoinFamily} disabled={!familyCode || syncing} className="rounded-xl">
                Beitreten
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="p-4 rounded-xl bg-primary/10">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Mit Familie verbunden
            </h4>
            <p className="text-sm text-muted-foreground">
              Code: <span className="font-mono">{state.familySync.familyCode}</span>
            </p>
            <p className="text-sm text-muted-foreground">Rolle: {state.familySync.role}</p>
            {showQR && <QRCodeDisplay code={state.familySync.familyCode} />}
          </div>

          <Button
            onClick={handleManualSync}
            disabled={syncing}
            variant="outline"
            className="w-full rounded-xl bg-transparent"
          >
            <Cloud className="w-4 h-4 mr-2" />
            Jetzt synchronisieren
          </Button>
        </>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
