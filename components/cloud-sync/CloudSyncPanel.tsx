"use client"

import { useState, useEffect } from "react"
import { useSyncId } from "@/hooks/useSyncId"
import { useFamily } from "@/context/family-context"
import { useConnectedDevices, type ConnectedDevice } from "@/hooks/useConnectedDevices"
import { isSupabaseConfigured } from "@/lib/supabase/client"
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
} from "lucide-react"

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
  const { devices, isLoading: devicesLoading, removeDevice, disconnectCurrentDevice } =
    useConnectedDevices(syncId)

  const [linkCode, setLinkCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [configChecked, setConfigChecked] = useState(false)
  const [apiConfigured, setApiConfigured] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

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

  const handleLink = () => {
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
    setSyncId(code)
    setLinkCode("")
  }

  const handleDisconnect = async () => {
    await disconnectCurrentDevice()
    setDisconnectDialogOpen(false)
  }

  const handleRemove = async (device: ConnectedDevice) => {
    if (!confirm(`„${device.deviceName}" wirklich entfernen?`)) return
    await removeDevice(device.deviceId)
  }

  const taskCount = state.tasks.filter((t) => t.isActive !== false).length
  const rewardCount = state.rewards.filter((r) => r.isActive !== false).length
  const childCount = state.children.length
  const ruleCount = state.rules.filter((r) => r.isActive !== false).length

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

      {/* 2. Daten-Übersicht */}
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

      {/* 3. Verbundene Geräte */}
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

      {/* 4. Familien-Code */}
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
          <Button onClick={handleLink} className="rounded-lg gap-1 shrink-0">
            <Smartphone className="w-4 h-4" />
            Koppeln
          </Button>
        </div>
        {linkError && <p className="text-xs text-destructive mt-1">{linkError}</p>}
      </div>

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
