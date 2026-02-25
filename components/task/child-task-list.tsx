"use client"

import { useTasks } from "@/hooks/useTasks"
import { CheckCircle, Circle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Schlanke Task-Liste für ein Kind: Daten nur aus useTasks(), keine globalen States.
 * Optimistic UI: Klick auf Kreis/Haken aktualisiert sofort die lokale DB → UI reagiert,
 * Sync ins Backend passiert im Hintergrund.
 *
 * Nutzung z. B.: <ChildTaskList childId={selectedChild.id} childName={selectedChild.name} />
 */
export function ChildTaskList({
  childId,
  childName,
}: {
  childId: string
  childName?: string
}) {
  const { tasks, isLoading, toggleTaskStatus, deleteTask } = useTasks()

  const childTasks = tasks.filter((t) => t.assigned_to === childId || !t.assigned_to)

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground py-4">Lade Aufgaben…</p>
    )
  }

  return (
    <div className="space-y-3">
      {childName && (
        <h3 className="font-bold text-lg text-foreground">
          Aufgaben für {childName}
        </h3>
      )}

      {childTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Alles erledigt! Gut gemacht. 🎉
        </p>
      ) : (
        childTasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "p-4 rounded-xl border flex items-center justify-between transition-colors",
              task.is_completed
                ? "bg-primary/5 border-primary/30"
                : "bg-card border-border"
            )}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleTaskStatus(task.id, !task.is_completed)}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                aria-label={task.is_completed ? "Als offen markieren" : "Als erledigt markieren"}
              >
                {task.is_completed ? (
                  <CheckCircle className="w-6 h-6 text-primary" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground" />
                )}
              </button>
              <div>
                <p
                  className={cn(
                    "font-medium",
                    task.is_completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {task.points} Punkte
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={() => deleteTask(task.id)}
              aria-label="Aufgabe löschen"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  )
}
