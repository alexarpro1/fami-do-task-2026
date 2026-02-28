// Notification helper functions (Capacitor Local Notifications mit Fallback auf Web Notification API)

async function sendViaCapacitor(title: string, body: string, id: number): Promise<boolean> {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications")
    const { Capacitor } = await import("@capacitor/core")
    if (!Capacitor.isNativePlatform()) return false
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true },
        },
      ],
    })
    return true
  } catch (_) {
    return false
  }
}

function sendViaWeb(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return
  try {
    new Notification(title, { body, icon: "/icon-192.png", tag: `famiapp-${Date.now()}` })
  } catch (error) {
    console.error("Failed to send notification:", error)
  }
}

export async function sendTaskCompletionNotification(childName: string, taskTitle: string, points: number) {
  const title = `${childName} hat eine Aufgabe erledigt!`
  const body = `"${taskTitle}" abgeschlossen (+${points} Punkte)`
  const sent = await sendViaCapacitor(title, body, 1)
  if (!sent) sendViaWeb(title, body)
}

export async function sendDailySummaryNotification(
  children: Array<{ name: string; tasksCompleted: number; pointsEarned: number }>,
) {
  const totalTasks = children.reduce((sum, c) => sum + c.tasksCompleted, 0)
  const totalPoints = children.reduce((sum, c) => sum + c.pointsEarned, 0)
  const body =
    children.length === 1
      ? `${children[0].name}: ${children[0].tasksCompleted} Aufgaben, ${children[0].pointsEarned} Punkte`
      : `${totalTasks} Aufgaben erledigt, ${totalPoints} Punkte verdient`
  const title = "FamiApp Tages-Zusammenfassung"
  const sent = await sendViaCapacitor(title, body, 2)
  if (!sent) sendViaWeb(title, body)
}

/** Einheitliche Benachrichtigung (Task-Erinnerungen etc.): Native Local Notifications oder Web-API. */
export async function sendNotification(title: string, body: string, options?: { icon?: string; id?: number }) {
  const id = options?.id ?? Math.max(3, Math.floor(Math.random() * 9997) + 10)
  const sent = await sendViaCapacitor(title, body, id)
  if (!sent) sendViaWeb(title, body)
}

/** Berechtigung anfragen: auf Native LocalNotifications, sonst Web Notification API. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const { Capacitor } = await import("@capacitor/core")
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications")
      const perm = await LocalNotifications.requestPermissions()
      return perm.display === "granted"
    }
  } catch (_) {
    // Fallback auf Web
  }
  if (!("Notification" in window)) return false
  if (Notification.permission === "granted") return true
  if (Notification.permission === "denied") return false
  const permission = await Notification.requestPermission()
  return permission === "granted"
}

export function scheduleDailySummary(time: string, callback: () => void) {
  const [hours, minutes] = time.split(":").map(Number)
  const now = new Date()
  const scheduledTime = new Date()
  scheduledTime.setHours(hours, minutes, 0, 0)

  // If time has passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1)
  }

  const delay = scheduledTime.getTime() - now.getTime()
  return setTimeout(callback, delay)
}
