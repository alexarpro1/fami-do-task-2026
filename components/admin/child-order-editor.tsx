"use client"

import { useState, useEffect } from "react"
import { ChevronUp, ChevronDown, GripVertical, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFamily } from "@/context/family-context"
import { ChildAvatar } from "@/components/child/child-avatar"

export function ChildOrderEditor() {
  const { state, dispatch } = useFamily()
  const [orderIds, setOrderIds] = useState<string[]>([])

  useEffect(() => {
    const ids = state.settings?.childOrder?.length
      ? state.settings.childOrder.filter((id) => state.children.some((c) => c.id === id))
      : state.children.map((c) => c.id)
    const missing = state.children.filter((c) => !ids.includes(c.id)).map((c) => c.id)
    setOrderIds([...ids, ...missing])
  }, [state.children, state.settings?.childOrder])

  const moveChild = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= orderIds.length) return
    const newOrder = [...orderIds]
    ;[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]
    setOrderIds(newOrder)
    dispatch({ type: "UPDATE_SETTINGS", payload: { childOrder: newOrder } })
  }

  const resetOrder = () => {
    const defaultOrder = state.children.map((c) => c.id)
    setOrderIds(defaultOrder)
    dispatch({ type: "UPDATE_SETTINGS", payload: { childOrder: defaultOrder } })
  }

  if (state.children.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Noch keine Kinder angelegt. Unter „Kinder“ kannst du welche hinzufügen.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Reihenfolge der Individuen (Kinder) anpassen</p>
        <Button variant="ghost" size="sm" onClick={resetOrder} className="text-xs gap-1">
          <RotateCcw className="w-3 h-3" />
          Zurücksetzen
        </Button>
      </div>

      <div className="space-y-2">
        {orderIds.map((id, index) => {
          const child = state.children.find((c) => c.id === id)
          if (!child) return null

          return (
            <div
              key={child.id}
              className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl border border-border"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <ChildAvatar avatar={child.avatar} color={child.color} size="sm" />
              <span className="flex-1 font-medium text-foreground truncate">{child.name}</span>

              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveChild(index, "up")}
                  disabled={index === 0}
                  aria-label="Nach oben"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveChild(index, "down")}
                  disabled={index === orderIds.length - 1}
                  aria-label="Nach unten"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
