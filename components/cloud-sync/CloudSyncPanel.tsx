"use client"

import { useState, useEffect } from "react"
import { useSyncId, ensureSyncIdInAuth } from "@/hooks/useSyncId"
import { useFamily } from "@/context/family-context"
import { useConnectedDevices, type ConnectedDevice } from "@/hooks/useConnectedDevices"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { fetchCloudPreview, type CloudPreviewResult } from "@/lib/supabase-sync"
import { pushImportedStateToSupabase } from "@/lib/backup-to-supabase"
import { triggerSuccess, triggerError, triggerHeavy, triggerLightClick } from "@/lib/haptics"
import { useDeviceRole } from "@/hooks/useDeviceRole"
import { PinLogin } from "@/components/admin/pin-login"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Copy,
  Check,
  Link2,
  Cloud,
  CloudOff,
  Smartphone,
  Monitor,
  Tablet,
  Crown,
  Trash2,
  Wifi,
  WifiOff,
  ListTodo,
  Gift,
  Scale,
  Users,
  RefreshCw,
  AlertTriangle,
  UserCircle,
  Baby,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

function DeviceIcon({ device }: { device: ConnectedDevice }) {
  const os = device.osVersion?.toLowerCase() ?? ""
  if (/android/i.test(os)) return <Smartphone className="w-4 h-4" />
  if (/ios/i.test(os)) return <Tablet className="w-4 h-4" />
  return <Monitor className="w-4 h-4" />
}

function RoleBadge({ role }: { role: string }) {
  if (role === "master") {
    return (
      <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-1">
        <Crown className="w-3 h-3" />
        Master
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
      {role === "child" ? "Kind" : "Eltern"}
    </Badge>
  )
}

function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        isOnline ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,.5)]" : "bg-muted-foreground/40"
      }`}
    />
  )
}

export function CloudSyncPanel() {
  const { syncId, isLoading: syncIdLoading, setSyncId } = useSyncId()
  const { state } = useFamily()
  const [deviceRole, setDeviceRole] = useDeviceRole()
  const { devices, isLoading: devicesLoading, removeDevice, disconnectCurrentDevice } =
    useConnectedDevices(syncId)
  const [showRolePinModal, setShowRolePinModal] = useState(false)

  const [linkCode, setLinkCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [configChecked, setConfigChecked] = useState(false)
  const [apiConfigured, setApiConfigured] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [showSafePairingModal, setShowSafePairingModal] = useState(false)
  const [pendingLinkCode, setPendingLinkCode] = useState("")
  const [cloudPreview, setCloudPreview] = useState<CloudPreviewResult | null>(null)
  const [linkLoading, setLinkLoading] = useState(false)
  const [uploadingLocal, setUploadingLocal] = useState(false)

  useEffect(() => {
    fetch("/api/supabase-config")
      .then((r) => r.json())
      .then((data) => {
        setApiConfigured(!!data?.configured)
        setConfigChecked(true)
      })
      .catch(() => {
        setApiConfigured(false)
        setConfigChecked(true)
      })
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    setIsOnline(navigator.onLine)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const configured = apiConfigured || isSupabaseConfigured()

  if (!configChecked) {
    return (
      <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 mx-auto mb-2 animate-spin opacity-50" />
        Cloud-Sync wird geprüft…
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        <CloudOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium">Cloud-Sync ist nicht konfiguriert.</p>
        <p className="text-xs mt-2">
          .env.local mit NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY anlegen.
          Dev-Server neu starten.
        </p>
      </div>
    )
  }

  if (syncIdLoading) {
    return (
      <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        Sync-Code wird geladen…
      </div>
    )
  }

  const handleCopy = () => {
    if (!syncId) return
    navigator.clipboard.writeText(syncId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLink = async () => {
    const code = linkCode.replace(/\s/g, "").toUpperCase().slice(0, 6)
    if (code.length !== 6) {
      setLinkError("Bitte einen 6-stelligen Code eingeben.")
      return
    }
    if (code === syncId) {
      setLinkError("Das ist bereits dein Code.")
      return
    }
    setLinkError(null)
    setLinkLoading(true)
    try {
      const preview = await fetchCloudPreview(code)
      setCloudPreview(preview)
      setPendingLinkCode(code)
      setShowSafePairingModal(true)
    } catch (e) {
      setLinkError("Cloud-Vorschau konnte nicht geladen werden.")
      setCloudPreview(null)
      setPendingLinkCode(code)
      setShowSafePairingModal(true)
    } finally {
      setLinkLoading(false)
    }
  }

  const handleUseCloudData = () => {
    if (pendingLinkCode) {
      setSyncId(pendingLinkCode)
      setLinkCode("")
      setPendingLinkCode("")
      setCloudPreview(null)
      setShowSafePairingModal(false)
      void triggerSuccess()
    }
  }

  const handleUploadLocal = async () => {
    if (!pendingLinkCode) return
    void triggerHeavy()
    setUploadingLocal(true)
    try {
      const auth = await ensureSyncIdInAuth(pendingLinkCode)
      if (!auth.ok) {
        setLinkError("Anmeldung für Cloud fehlgeschlagen.")
        setUploadingLocal(false)
        void triggerError()
        return
      }
      const result = await pushImportedStateToSupabase(state, pendingLinkCode, auth.client)
      if (!result.ok) {
        setLinkError(result.error ?? "Hochladen fehlgeschlagen.")
        setUploadingLocal(false)
        void triggerError()
        return
      }
      setSyncId(pendingLinkCode)
      setLinkCode("")
      setPendingLinkCode("")
      setCloudPreview(null)
      setShowSafePairingModal(false)
      setLinkError(null)
      void triggerSuccess()
    } finally {
      setUploadingLocal(false)
    }
  }

  const handleCancelPairing = () => {
    setShowSafePairingModal(false)
    setPendingLinkCode("")
    setCloudPreview(null)
  }

  const handleDisconnect = async () => {
    void triggerHeavy()
    await disconnectCurrentDevice()
    setDisconnectDialogOpen(false)
  }

  const handleRemove = async (device: ConnectedDevice) => {
    if (!confirm(`„${device.deviceName}" wirklich entfernen?`)) return
    await removeDevice(device.deviceId)
  }

  const adminPin = state.settings?.adminPin ?? "1234"
  const adminPinEnabled = state.settings?.adminPinEnabled ?? false

  const handleSetRoleParent = () => {
    if (adminPinEnabled) {
      setShowRolePinModal(true)
    } else {
      void setDeviceRole("parent").then(() => void triggerLightClick())
    }
  }

  const handleRolePinSuccess = () => {
    setShowRolePinModal(false)
    void setDeviceRole("parent").then(() => void triggerLightClick())
  }

  const handleSetRoleChild = () => {
    void setDeviceRole("child").then(() => void triggerLightClick())
  }

  const taskCount = state.tasks.filter((t) => t.isActive !== false).length
  const rewardCount = state.rewards.filter((r) => r.isActive !== false).length
  const childCount = state.children.length
  const ruleCount = state.rules.filter((r) => r.isActive !== false).length

  const cloudDataSum =
    (cloudPreview?.children_count ?? 0) +
    (cloudPreview?.tasks_count ?? 0) +
    (cloudPreview?.rewards_count ?? 0)
  const isCodeNotFound =
    showSafePairingModal && cloudPreview !== null && cloudDataSum === 0

  return (
    <div className="space-y-4">
      {/* 1. Sync-Status */}
      <div className="flex items-center gap-2 text-sm">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-muted-foreground">Online – Änderungen werden synchronisiert</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-orange-500" />
            <span className="text-orange-500">Offline – Änderungen werden lokal gespeichert</span>
          </>
        )}
      </div>

      {/* 2. Geräte-Rolle (Phase 18) */}
      <div className="rounded-xl bg-card border border-border p-4">
        <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <UserCircle className="w-4 h-4" />
          Dieses Gerät wird genutzt von
        </p>
        <div className="flex gap-2">
          <Button
            variant={deviceRole === "child" ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2 rounded-xl"
            onClick={handleSetRoleChild}
          >
            <Baby className="w-4 h-4" />
            Kind
          </Button>
          <Button
            variant={deviceRole === "parent" || deviceRole === "master" ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2 rounded-xl"
            onClick={handleSetRoleParent}
          >
            <UserCircle className="w-4 h-4" />
            Eltern
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {deviceRole === "child"
            ? "Hier siehst du keine offenen Freigaben. Wechsel zu „Eltern“ (mit PIN) um Anträge zu genehmigen."
            : "Du siehst offene Freigaben auf der Startseite und kannst sie genehmigen."}
        </p>
      </div>

      <Dialog open={showRolePinModal} onOpenChange={setShowRolePinModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>PIN eingeben</DialogTitle>
            <DialogDescription>
              Um dieses Gerät als Eltern-Gerät zu nutzen, bitte die 4-stellige Admin-PIN eingeben.
            </DialogDescription>
          </DialogHeader>
          <PinLogin
            correctPin={adminPin}
            onSuccess={handleRolePinSuccess}
            onCancel={() => setShowRolePinModal(false)}
            title="Gerät als Eltern"
            subtitle="PIN eingeben"
          />
        </DialogContent>
      </Dialog>

      {/* 3. Daten-Übersicht */}
      <div className="rounded-xl bg-muted/30 border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Synchronisierte Daten</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{childCount} {childCount === 1 ? "Kind" : "Kinder"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ListTodo className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{taskCount} {taskCount === 1 ? "Aufgabe" : "Aufgaben"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{rewardCount} {rewardCount === 1 ? "Belohnung" : "Belohnungen"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{ruleCount} {ruleCount === 1 ? "Regel" : "Regeln"}</span>
          </div>
        </div>
      </div>

      {/* 4. Verbundene Geräte */}
      <div className="rounded-xl bg-card border border-border p-4">
        <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Verbundene Geräte
          {!devicesLoading && devices.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
              {devices.length}
            </Badge>
          )}
        </p>

        {devicesLoading ? (
          <div className="text-xs text-muted-foreground text-center py-3">
            <RefreshCw className="w-4 h-4 mx-auto mb-1 animate-spin opacity-50" />
            Geräte werden geladen…
          </div>
        ) : devices.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Noch keine Geräte verbunden.
          </p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <div
                key={d.deviceId}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                  d.isCurrentDevice
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted/30"
                }`}
              >
                <OnlineDot isOnline={d.isOnline} />
                <DeviceIcon device={d} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {d.deviceName}
                      {d.isCurrentDevice && (
                        <span className="text-xs text-muted-foreground ml-1">(dieses Gerät)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RoleBadge role={d.role} />
                    {d.osVersion && (
                      <span className="text-[10px] text-muted-foreground">{d.osVersion}</span>
                    )}
                  </div>
                </div>
                {!d.isCurrentDevice && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleRemove(d)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Familien-Code */}
      <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
        <p className="text-sm font-medium text-foreground mb-1">Dein Familien-Code</p>
        <p className="text-2xl font-mono font-bold tracking-widest text-primary mb-2">{syncId}</p>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 rounded-lg">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Kopiert" : "Kopieren"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Diesen Code auf einem anderen Gerät eingeben, um dieselben Daten zu nutzen.
        </p>
      </div>

      {/* 5. Anderes Gerät koppeln */}
      <div className="rounded-xl bg-card border border-border p-4">
        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Anderes Gerät koppeln
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="6-stelligen Code eingeben"
            value={linkCode}
            onChange={(e) => {
              setLinkCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
              setLinkError(null)
            }}
            className="font-mono tracking-widest text-center rounded-lg"
            maxLength={6}
          />
          <Button
            onClick={handleLink}
            className="rounded-lg gap-1 shrink-0"
            disabled={linkLoading}
          >
            {linkLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
            {linkLoading ? "Laden…" : "Koppeln"}
          </Button>
        </div>
        {linkError && <p className="text-xs text-destructive mt-1">{linkError}</p>}
      </div>

      <AlertDialog open={showSafePairingModal} onOpenChange={(open) => !open && handleCancelPairing()}>
        <AlertDialogContent className="w-[min(32rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] min-h-[18rem]">
          {isCodeNotFound ? (
            <>
              <AlertDialogHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-8 w-8 shrink-0 text-amber-500" aria-hidden />
                  <AlertDialogTitle>Familiencode nicht gefunden!</AlertDialogTitle>
                </div>
                <AlertDialogDescription asChild>
                  <p className="text-left mt-2">
                    Unter dem Code &quot;{pendingLinkCode || "…"}&quot; wurden keine Daten gefunden. Hast du dich vertippt? Oder möchtest du unter genau diesem Code eine komplett neue Familie anlegen?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <AlertDialogCancel onClick={handleCancelPairing}>Abbrechen</AlertDialogCancel>
                <Button onClick={handleUploadLocal} disabled={uploadingLocal}>
                  {uploadingLocal ? "Wird angelegt…" : "Als neue Familie anlegen"}
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Gerät koppeln – Daten wählen</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="text-left mt-1 space-y-4">
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Wähle, welche Daten fortan gelten sollen. Bei „Lokale Daten hochladen“ werden bestehende Cloud-Daten überschrieben.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 min-h-[5.75rem] flex flex-col min-w-0 w-[200px] justify-start items-center">
                        <p className="text-xs font-medium text-muted-foreground mb-2 shrink-0 flex flex-col justify-start items-center">Auf diesem Gerät</p>
                        <p className="text-sm text-foreground leading-snug break-words flex flex-col justify-center items-center">
                          {taskCount} {taskCount === 1 ? "Aufgabe" : "Aufgaben"}, {childCount} {childCount === 1 ? "Kind" : "Kinder"}, {rewardCount} {rewardCount === 1 ? "Belohnung" : "Belohnungen"}, {ruleCount} {ruleCount === 1 ? "Regel" : "Regeln"}.
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 min-h-[5.75rem] flex flex-col min-w-0 w-[200px] justify-start items-center">
                        <p className="text-xs font-medium text-muted-foreground mb-2 shrink-0 flex flex-col justify-start items-center">In der Cloud (Code {pendingLinkCode || "…"})</p>
                        <p className="text-sm text-foreground leading-snug break-words flex flex-col justify-center items-center">
                          {cloudPreview?.error
                            ? "Vorschau nicht verfügbar."
                            : `${cloudPreview?.tasks_count ?? "–"} Aufgaben, ${cloudPreview?.children_count ?? "–"} ${(cloudPreview?.children_count ?? 0) === 1 ? "Kind" : "Kinder"}, ${cloudPreview?.rewards_count ?? "–"} Belohnungen.`}
                        </p>
                      </div>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-2 border-t border-border/50 mt-1">
                <AlertDialogCancel onClick={handleCancelPairing}>Abbrechen</AlertDialogCancel>
                <Button
                  variant="destructive"
                  className="w-[170px] sm:mr-auto order-last sm:order-none"
                  onClick={handleUploadLocal}
                  disabled={uploadingLocal}
                  title="Bestehende Cloud-Daten werden überschrieben."
                >
                  {uploadingLocal ? "Wird hochgeladen…" : "Lokale Daten hochladen"}
                </Button>
                <AlertDialogAction onClick={handleUseCloudData} className="w-[180px]">
                  Cloud-Daten übernehmen
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* 6. Gerät trennen */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive bg-transparent rounded-lg"
        onClick={() => setDisconnectDialogOpen(true)}
      >
        <Cloud className="w-4 h-4 mr-2" />
        Gerät trennen
      </Button>

      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerät trennen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieses Gerät wird von der Cloud-Sync-Familie getrennt. Deine lokalen Daten bleiben auf diesem Gerät erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Trennen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
