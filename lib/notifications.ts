// Notification helper functions

export async function sendTaskCompletionNotification(childName: string, taskTitle: string, points: number) {
  if (!("Notification" in window) || Notification.permission !== "granted") return

  try {
    new Notification(`${childName} hat eine Aufgabe erledigt!`, {
      body: `"${taskTitle}" abgeschlossen (+${points} Punkte)`,
      icon: "/icon-192.png",
      tag: "task-completion",
    })
  } catch (error) {
    console.error("Failed to send notification:", error)
  }
}

export async function sendDailySummaryNotification(
  children: Array<{ name: string; tasksCompleted: number; pointsEarned: number }>,
) {
  if (!("Notification" in window) || Notification.permission !== "granted") return

  const totalTasks = children.reduce((sum, c) => sum + c.tasksCompleted, 0)
  const totalPoints = children.reduce((sum, c) => sum + c.pointsEarned, 0)

  const body =
    children.length === 1
      ? `${children[0].name}: ${children[0].tasksCompleted} Aufgaben, ${children[0].pointsEarned} Punkte`
      : `${totalTasks} Aufgaben erledigt, ${totalPoints} Punkte verdient`

  try {
    new Notification("FamiApp Tages-Zusammenfassung", {
      body,
      icon: "/icon-192.png",
      tag: "daily-summary",
    })
  } catch (error) {
    console.error("Failed to send notification:", error)
  }
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
