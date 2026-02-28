"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { QRCodeDisplay } from "./qr-code-display"
import {
  Users,
  Link,
  Unlink,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Smartphone,
  UserMinus,
  Loader2,
  QrCode,
  Wifi,
  WifiOff,
  Crown,
} from "lucide-react"
import { useFamily } from "@/context/family-context"
import {
  createFamily,
  joinFamily,
  leaveFamily,
  pushData,
  pullData,
  getFamilyInfo,
  getFamilyMembers,
  removeFamilyMember,
} from "@/lib/family-sync"
import { useTranslation } from "@/hooks/use-translation"

export function FamilySyncPanel() {
  const { t } = useTranslation()
  const { state, dispatch } = useFamily()

  const [isConnected, setIsConnected] = useState(false)
  const [familyCode, setFamilyCode] = useState("")
  const [familyName, setFamilyName] = useState("")
  const [role, setRole] = useState<string | null>(null)
  const [members, setMembers] = useState<any[]>([])

  const [joinCode, setJoinCode] = useState("")
  const [newFamilyName, setNewFamilyName] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [showQRCode, setShowQRCode] = useState(false)
  const [leaveFamilyDialogOpen, setLeaveFamilyDialogOpen] = useState(false)

  // Online-Status ueberwachen
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

  // Initial check family connection
  useEffect(() => {
    checkConnection()
  }, [])

  // Realtime subscription
  /*
  useEffect(() => {
    if (!isConnected) return

    const unsubscribe = subscribeToFamilyChanges((newData) => {
      // Daten wurden von anderem Geraet geaendert
      dispatch({ type: "LOAD_STATE", payload: newData })
      setLastSync(new Date())
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [isConnected, dispatch])
  */

  async function checkConnection() {
    const info = await getFamilyInfo()
    setIsConnected(info.connected)
    setFamilyCode(info.familyCode || "")
    setFamilyName(info.familyName || "")
    setRole(info.role || null)

    if (info.connected) {
      loadMembers()
    }
  }

  async function loadMembers() {
    const result = await getFamilyMembers()
    if (result.success && result.members) {
      setMembers(result.members)
    }
  }

  async function handleCreateFamily() {
    if (!newFamilyName.trim()) {
      setError("Bitte Familienname eingeben")
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await createFamily(newFamilyName.trim())

    if (result.success) {
      setFamilyCode(result.familyCode!)
      setIsConnected(true)
      setRole("master")
      setSuccess("Familie erfolgreich erstellt!")
      setNewFamilyName("")

      // Initial sync
      await pushData(state)
      setLastSync(new Date())
      loadMembers()
    } else {
      setError(result.error || "Fehler beim Erstellen")
    }

    setIsLoading(false)
  }

  async function handleJoinFamily() {
    if (!joinCode.trim()) {
      setError("Bitte Familien-Code eingeben")
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await joinFamily(joinCode.trim().toUpperCase())

    if (result.success) {
      setIsConnected(true)
      setFamilyCode(joinCode.trim().toUpperCase())
      setFamilyName(result.familyName || "")
      setRole(result.role || "parent")
      setSuccess(`Erfolgreich mit "${result.familyName}" verbunden!`)
      setJoinCode("")

      // Daten von Cloud laden
      const pullResult = await pullData()
      if (pullResult.success && pullResult.data) {
        dispatch({ type: "LOAD_STATE", payload: pullResult.data })
      }
      setLastSync(new Date())
      loadMembers()
    } else {
      setError(result.error || "Fehler beim Beitreten")
    }

    setIsLoading(false)
  }

  async function handleLeaveFamily() {
    setLeaveFamilyDialogOpen(false)
    setIsLoading(true)
    const result = await leaveFamily()

    if (result.success) {
      setIsConnected(false)
      setFamilyCode("")
      setFamilyName("")
      setRole(null)
      setMembers([])
      setSuccess("Familie verlassen")
    } else {
      setError(result.error || "Fehler")
    }

    setIsLoading(false)
  }

  async function handleSync() {
    setIsSyncing(true)
    setError(null)

    // Push lokale Aenderungen
    const pushResult = await pushData(state)

    if (pushResult.success) {
      setLastSync(new Date())
      setSuccess("Synchronisiert!")
    } else {
      setError(pushResult.error || "Sync fehlgeschlagen")
    }

    setIsSyncing(false)
  }

  async function handleRemoveMember(memberId: string, deviceName: string) {
    if (!confirm(`"${deviceName}" wirklich entfernen?`)) {
      return
    }

    const result = await removeFamilyMember(memberId)
    if (result.success) {
      loadMembers()
      setSuccess("Mitglied entfernt")
    } else {
      setError(result.error || "Fehler")
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(familyCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  return (
    <div className="space-y-4">
      {/* Online Status */}
      <div className="flex items-center gap-2 text-sm">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-orange-500" />
            <span className="text-orange-500">Offline - Aenderungen werden lokal gespeichert</span>
          </>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">{success}</div>}

      {isConnected ? (
        /* Connected State */
        <div className="space-y-4">
          {/* Family Info Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{familyName || "Meine Familie"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={role === "master" ? "default" : "secondary"} className="text-xs">
                        {role === "master" && <Crown className="h-3 w-3 mr-1" />}
                        {role === "master" ? "Master Admin" : role === "parent" ? "Elternteil" : "Kind"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing || !isOnline}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  Sync
                </Button>
              </div>

              {lastSync && (
                <p className="text-xs text-muted-foreground mt-3">
                  Letzte Synchronisierung: {lastSync.toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Family Code */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Familien-Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded-lg text-center font-mono text-lg tracking-widest">
                  {familyCode}
                </code>
                <Button variant="outline" size="icon" onClick={copyCode}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {role === "master" && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    onClick={() => setShowQRCode(!showQRCode)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {showQRCode ? "QR-Code verstecken" : "QR-Code anzeigen"}
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">Teile diesen Code mit anderen Familienmitgliedern</p>
            </CardContent>
          </Card>

          {showQRCode && role === "master" && <QRCodeDisplay code={familyCode} familyName={familyName} />}

          {/* Members List (only for master) */}
          {role === "master" && members.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Verbundene Geraete ({members.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {member.role === "master" ? (
                        <Shield className="h-4 w-4 text-primary" />
                      ) : (
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">{member.device_name || "Unbekannt"}</span>
                      <Badge variant="outline" className="text-xs">
                        {member.role === "master" ? "Master" : member.role === "parent" ? "Eltern" : "Kind"}
                      </Badge>
                    </div>

                    {member.role !== "master" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member.id, member.device_name)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Leave Button */}
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive bg-transparent"
            onClick={() => setLeaveFamilyDialogOpen(true)}
            disabled={isLoading}
          >
            <Unlink className="h-4 w-4 mr-2" />
            Familie verlassen
          </Button>

          <AlertDialog open={leaveFamilyDialogOpen} onOpenChange={setLeaveFamilyDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Familie verlassen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Du wirst von dieser Familie getrennt. Deine lokalen Daten bleiben auf diesem Gerät erhalten.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleLeaveFamily} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Familie verlassen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        /* Not Connected State */
        <div className="space-y-6">
          {/* Create Family */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Neue Familie erstellen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Familienname (z.B. Familie Mueller)"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
              />
              <Button className="w-full" onClick={handleCreateFamily} disabled={isLoading || !isOnline}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                Familie erstellen
              </Button>
              <p className="text-xs text-muted-foreground">Du wirst Master-Admin und kannst andere einladen</p>
            </CardContent>
          </Card>

          {/* Join Family */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Link className="h-4 w-4" />
                Bestehender Familie beitreten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Familien-Code eingeben"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="font-mono text-center tracking-widest"
                maxLength={8}
              />
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleJoinFamily}
                disabled={isLoading || !isOnline}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link className="h-4 w-4 mr-2" />}
                Beitreten
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
