"use client"

import { useFamily } from "@/context/family-context"
import { Bell, BellRing, Clock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export function ParentNotificationSettings() {
  const { state, dispatch } = useFamily()
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default")

  useEffect(() => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)
      if (permission === "granted") {
        dispatch({
          type: "UPDATE_SETTINGS",
          payload: { parentNotificationsEnabled: true },
        })
      }
    }
  }

  const updateSetting = (key: string, value: boolean | string) => {
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { [key]: value },
    })
  }

  const sendTestNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("FamiApp Test", {
        body: "Benachrichtigungen funktionieren!",
        icon: "/icon-192.png",
      })
    }
  }

  const parentNotificationsEnabled = state.settings.parentNotificationsEnabled ?? false
  const dailySummaryEnabled = state.settings.dailySummaryEnabled ?? false
  const dailySummaryTime = state.settings.dailySummaryTime ?? "20:00"

  return (
    <div className="space-y-4">
      {/* Permission Status */}
      {permissionStatus !== "granted" && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Benachrichtigungen sind nicht aktiviert</p>
          <Button size="sm" onClick={requestPermission} className="rounded-full">
            <Bell className="w-4 h-4 mr-2" />
            Erlauben
          </Button>
        </div>
      )}

      {permissionStatus === "granted" && (
        <>
          {/* Task Completion Notifications */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <BellRing className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-foreground">Bei Aufgaben-Erledigung</p>
                <p className="text-xs text-muted-foreground">Benachrichtigung wenn ein Kind eine Aufgabe erledigt</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting("parentNotificationsEnabled", !parentNotificationsEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative
                ${parentNotificationsEnabled ? "bg-primary" : "bg-secondary"}`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform
                  ${parentNotificationsEnabled ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>

          {/* Daily Summary */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-foreground">Tages-Zusammenfassung</p>
                <p className="text-xs text-muted-foreground">Abendliche Uebersicht aller Aktivitaeten</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting("dailySummaryEnabled", !dailySummaryEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative
                ${dailySummaryEnabled ? "bg-primary" : "bg-secondary"}`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform
                  ${dailySummaryEnabled ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>

          {/* Summary Time */}
          {dailySummaryEnabled && (
            <div className="flex items-center justify-between py-2 pl-8">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-foreground">Uhrzeit</p>
              </div>
              <input
                type="time"
                value={dailySummaryTime}
                onChange={(e) => updateSetting("dailySummaryTime", e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
              />
            </div>
          )}

          {/* Test Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={sendTestNotification}
            className="w-full rounded-xl bg-transparent"
          >
            <Bell className="w-4 h-4 mr-2" />
            Test-Benachrichtigung senden
          </Button>
        </>
      )}
    </div>
  )
}
