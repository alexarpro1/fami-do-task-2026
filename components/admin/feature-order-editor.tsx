"use client"

import { useState, useEffect } from "react"
import { useFamily } from "@/context/family-context"

export const DEFAULT_FEATURE_ORDER: string[] = [
  "soundEnabled",
  "animationsEnabled",
  "showConfetti",
  "petSystemEnabled",
  "stickerSystemEnabled",
  "weatherEnabled",
  "moodTrackingEnabled",
  "shopEnabled",
  "profileEnabled",
  "gamesEnabled",
]

const FEATURE_LABELS: Record<string, string> = {
  soundEnabled: "Sound-Effekte",
  animationsEnabled: "Animationen",
  showConfetti: "Konfetti-Effekte",
  petSystemEnabled: "Haustier-System",
  stickerSystemEnabled: "Sticker-Album",
  weatherEnabled: "Wetter-Widget",
  moodTrackingEnabled: "Stimmungs-Tracker",
  shopEnabled: "Shop / Belohnungen",
  profileEnabled: "Profil-Seite",
  gamesEnabled: "Spiele (Minigames)",
}

/** Hook für Reihenfolge + Verschieben; für zusammengeführte Zeilen (Reihenfolge + Toggle) im Panel. */
export function useFeatureOrder() {
  const { state, dispatch } = useFamily()
  const [orderIds, setOrderIds] = useState<string[]>(DEFAULT_FEATURE_ORDER)

  useEffect(() => {
    const saved = state.settings?.featureOrder
    if (saved?.length) {
      const known = new Set(DEFAULT_FEATURE_ORDER)
      const ordered = saved.filter((id) => known.has(id))
      const missing = DEFAULT_FEATURE_ORDER.filter((id) => !ordered.includes(id))
      setOrderIds([...ordered, ...missing])
    } else {
      setOrderIds(DEFAULT_FEATURE_ORDER)
    }
  }, [state.settings?.featureOrder])

  const moveFeature = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= orderIds.length) return
    const newOrder = [...orderIds]
    ;[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]
    setOrderIds(newOrder)
    dispatch({ type: "UPDATE_SETTINGS", payload: { featureOrder: newOrder } })
  }

  const resetOrder = () => {
    setOrderIds(DEFAULT_FEATURE_ORDER)
    dispatch({ type: "UPDATE_SETTINGS", payload: { featureOrder: DEFAULT_FEATURE_ORDER } })
  }

  return { orderIds, moveFeature, resetOrder }
}
