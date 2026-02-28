"use client"

import { useEffect, useRef, useCallback } from "react"
import { useFamily } from "@/context/family-context"
import { requestNotificationPermission, sendNotification } from "@/lib/notifications"
import type { Task } from "@/types"

// Category emojis for notifications
const CATEGORY_EMOJIS: Record<string, string> = {
  morning: "🌅",
  evening: "🌙",
  weekend: "🎉",
  custom: "✨",
}

// Helper to parse time string to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

// Helper to get current day key
function getCurrentDayKey(): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  return days[new Date().getDay()]
}

export { requestNotificationPermission }

export function useTaskNotifications() {
  const { state, selectedChild } = useFamily()
  const notifiedTasksRef = useRef<Set<string>>(new Set())
  const lastCheckRef = useRef<number>(0)

  const checkAndNotify = useCallback(() => {
    if (!state.settings.notificationsEnabled) return
    if (!selectedChild) return

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const currentDayKey = getCurrentDayKey()
    const today = now.toDateString()

    // Reset notified tasks at midnight
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      notifiedTasksRef.current.clear()
    }

    const tasks = state.tasks ?? []
    const notifyBefore = state.settings.notifyBeforeMinutes ?? 0

    tasks.forEach((task: Task) => {
      // Skip inactive tasks
      if (!task.isActive) return

      // Skip tasks without time window
      if (!task.startTime) return

      // Skip tasks not for today
      if (task.days && task.days.length > 0 && !task.days.includes(currentDayKey)) return

      // Generate unique key for today's notification
      const notificationKey = `${task.id}-${today}`

      // Skip if already notified today
      if (notifiedTasksRef.current.has(notificationKey)) return

      const startMinutes = timeToMinutes(task.startTime)
      const notifyAt = startMinutes - notifyBefore

      // Check if it's time to notify (within 1 minute window)
      if (currentMinutes >= notifyAt && currentMinutes < notifyAt + 1) {
        const emoji = CATEGORY_EMOJIS[task.category] || "📋"
        const childName = selectedChild.name

        let title = `${emoji} ${task.title} startet jetzt!`
        let body = `Hey ${childName}! Zeit fuer: ${task.title}`

        if (notifyBefore > 0) {
          title = `${emoji} ${task.title} startet in ${notifyBefore} Min!`
          body = `Hey ${childName}! In ${notifyBefore} Minuten beginnt: ${task.title}`
        }

        if (task.endTime) {
          body += ` (bis ${task.endTime})`
        }

        sendNotification(title, body)
        notifiedTasksRef.current.add(notificationKey)
      }
    })
  }, [state.tasks, state.settings.notificationsEnabled, state.settings.notifyBeforeMinutes, selectedChild])

  useEffect(() => {
    if (!state.settings.notificationsEnabled) return

    // Check immediately
    checkAndNotify()

    // Check every minute
    const interval = setInterval(() => {
      const now = Date.now()
      // Prevent multiple checks within same minute
      if (now - lastCheckRef.current < 50000) return
      lastCheckRef.current = now
      checkAndNotify()
    }, 60000)

    return () => clearInterval(interval)
  }, [checkAndNotify, state.settings.notificationsEnabled])

  return {
    requestPermission: requestNotificationPermission,
    isSupported: typeof window !== "undefined" && "Notification" in window,
    permission: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied",
  }
}
