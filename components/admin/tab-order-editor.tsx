"use client"

import { useState, useEffect } from "react"
import { ChevronUp, ChevronDown, GripVertical, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFamily } from "@/context/family-context"
import type { AdminTab } from "@/types"

const TABS_CONFIG: Record<AdminTab, { label: string; emoji: string }> = {
  children: { label: "Kinder", emoji: "👶" },
  tasks: { label: "Aufgaben", emoji: "✅" },
  rules: { label: "Regeln", emoji: "⚖️" },
  rewards: { label: "Shop", emoji: "🎁" },
  stats: { label: "Statistik", emoji: "📊" },
  settings: { label: "Einstellungen", emoji: "⚙️" },
}

const DEFAULT_ORDER: AdminTab[] = ["children", "tasks", "rules", "rewards", "stats", "settings"]

export function TabOrderEditor() {
  const { state, dispatch } = useFamily()
  const [tabOrder, setTabOrder] = useState<AdminTab[]>(DEFAULT_ORDER)

  useEffect(() => {
    const savedOrder = state.settings?.adminTabOrder
    if (savedOrder && savedOrder.length === 6) {
      setTabOrder(savedOrder)
    }
  }, [state.settings?.adminTabOrder])

  const moveTab = (index: number, direction: "up" | "down") => {
    const newOrder = [...tabOrder]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newOrder.length) return // Swap
    ;[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]

    setTabOrder(newOrder)
    dispatch({ type: "UPDATE_SETTINGS", payload: { adminTabOrder: newOrder } })
  }

  const resetOrder = () => {
    setTabOrder(DEFAULT_ORDER)
    dispatch({ type: "UPDATE_SETTINGS", payload: { adminTabOrder: DEFAULT_ORDER } })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Reihenfolge der Admin-Menues anpassen</p>
        <Button variant="ghost" size="sm" onClick={resetOrder} className="text-xs gap-1">
          <RotateCcw className="w-3 h-3" />
          Zuruecksetzen
        </Button>
      </div>

      <div className="space-y-2">
        {tabOrder.map((tabId, index) => {
          const tab = TABS_CONFIG[tabId]
          if (!tab) return null

          return (
            <div key={tabId} className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl border border-border">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="text-xl">{tab.emoji}</span>
              <span className="flex-1 font-medium">{tab.label}</span>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveTab(index, "up")}
                  disabled={index === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveTab(index, "down")}
                  disabled={index === tabOrder.length - 1}
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
