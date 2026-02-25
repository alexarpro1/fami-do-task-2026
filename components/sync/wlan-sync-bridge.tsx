"use client"

import { useWlanSync } from "@/hooks/use-wlan-sync"

/**
 * Renders nothing; runs WLAN sync integration (send state / receive and apply).
 * Must be inside FamilyProvider.
 */
export function WlanSyncBridge() {
  useWlanSync()
  return null
}
