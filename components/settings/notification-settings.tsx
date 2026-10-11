"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, BellRing, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useFamily } from "@/context/family-context"
import { requestNotificationPermission, getNotificationPermission } from "@/lib/notifications"

type PermissionState = "granted" | "denied" | "default"

export function NotificationSettings() {
  const { state, dispatch } = useFamily()
  const [permission, setPermission] = useState<PermissionState>("default")
  const [isSupported, setIsSupported] = useState(false)

  const refreshPermission = async () => {
    if (typeof window === "undefined") return
    let supported = false
    try {
      const { Capacitor } = await import("@capacitor/core")
      supported = Capacitor.isNativePlatform() || "Notification" in window
    } catch {
      supported = "Notification" in window
    }
    setIsSupported(supported)
    if (supported) setPermission(await getNotificationPermission())
  }

  useEffect(() => {
    refreshPermission()
  }, [])

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission()
    setPermission(await getNotificationPermission())
    if (granted) {
      dispatch({ type: "UPDATE_SETTINGS", payload: { notificationsEnabled: true } })
    }
  }

  const handleToggleNotifications = (enabled: boolean) => {
    if (enabled && permission !== "granted") {
      handleRequestPermission()
    } else {
      dispatch({ type: "UPDATE_SETTINGS", payload: { notificationsEnabled: enabled } })
    }
  }

  const handleNotifyBeforeChange = (value: number[]) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: { notifyBeforeMinutes: value[0] } })
  }

  const sendTestNotification = async () => {
    if (permission !== "granted") return
    const { sendNotification } = await import("@/lib/notifications")
    await sendNotification("🔔 Test-Benachrichtigung", "Die Benachrichtigungen funktionieren!")
  }

  if (!isSupported) {
    return (
      <div className="rounded-xl bg-card p-4 border border-border">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Benachrichtigungen werden von diesem Gerät/Browser nicht unterstützt.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Permission Status – responsive: auf kleinen Screens Button unter dem Text */}
      <div className="rounded-xl bg-card p-4 border border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {permission === "granted" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            ) : permission === "denied" ? (
              <XCircle className="h-5 w-5 shrink-0 text-red-500" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-yellow-500" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {permission === "granted"
                  ? "Berechtigung erteilt"
                  : permission === "denied"
                    ? "Berechtigung verweigert"
                    : "Berechtigung erforderlich"}
              </p>
              <p className="text-sm text-muted-foreground break-words">
                {permission === "granted"
                  ? "Du erhältst Benachrichtigungen für Aufgaben."
                  : permission === "denied"
                    ? "Bitte erlaube Benachrichtigungen in den Browser- bzw. Geräte-Einstellungen."
                    : "Klicke auf „Erlauben“, um Benachrichtigungen zu aktivieren."}
              </p>
            </div>
          </div>
          {permission !== "granted" && permission !== "denied" && (
            <Button onClick={handleRequestPermission} size="sm" className="shrink-0 self-start sm:self-center">
              Erlauben
            </Button>
          )}
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="rounded-xl bg-card p-4 border border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {state.settings.notificationsEnabled ? (
              <BellRing className="h-5 w-5 shrink-0 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <Label className="font-medium text-foreground">Push-Benachrichtigungen</Label>
              <p className="text-sm text-muted-foreground break-words">Erinnerungen, wenn Zeitfenster beginnen</p>
            </div>
          </div>
          <Switch
            checked={state.settings.notificationsEnabled}
            onCheckedChange={handleToggleNotifications}
            disabled={permission === "denied"}
          />
        </div>
      </div>

      {/* Notify Before Time */}
      {state.settings.notificationsEnabled && permission === "granted" && (
        <>
          <div className="rounded-xl bg-card p-4 border border-border space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <Label className="font-medium text-foreground">Vorab-Erinnerung</Label>
                <p className="text-sm text-muted-foreground break-words">
                  {state.settings.notifyBeforeMinutes === 0
                    ? "Benachrichtigung bei Beginn des Zeitfensters"
                    : `${state.settings.notifyBeforeMinutes} Minuten vor Beginn benachrichtigen`}
                </p>
              </div>
            </div>

            <div className="px-2">
              <Slider
                value={[state.settings.notifyBeforeMinutes]}
                onValueChange={handleNotifyBeforeChange}
                min={0}
                max={30}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between gap-1 text-xs text-muted-foreground mt-2">
                <span>Sofort</span>
                <span>5 Min</span>
                <span>10 Min</span>
                <span>15 Min</span>
                <span>20 Min</span>
                <span>25 Min</span>
                <span>30 Min</span>
              </div>
            </div>
          </div>

          {/* Test Button */}
          <Button onClick={sendTestNotification} variant="outline" className="w-full gap-2 bg-transparent">
            <Bell className="h-4 w-4" />
            Test-Benachrichtigung senden
          </Button>
        </>
      )}
    </div>
  )
}
