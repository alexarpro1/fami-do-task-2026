// Moved from lib/family-sync.ts

import type { FamilyState } from "@/types"

export async function createFamily(state: FamilyState): Promise<string> {
  throw new Error("Family sync is currently disabled - check beta-archive for implementation")
}

export async function joinFamily(code: string, deviceId: string): Promise<FamilyState> {
  throw new Error("Family sync is currently disabled - check beta-archive for implementation")
}

export function generateFamilyCode(): string {
  throw new Error("Family sync is currently disabled - check beta-archive for implementation")
}

export async function syncFamilyData(state: FamilyState): Promise<void> {
  throw new Error("Family sync is currently disabled - check beta-archive for implementation")
}

export function enableAutoSync(state: FamilyState, onSyncComplete?: (success: boolean) => void): () => void {
  console.warn("Auto-sync is disabled in stable version")
  return () => {}
}
