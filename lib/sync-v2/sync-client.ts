/**
 * sync-v2 – SyncClient: Push/Pull über einen SyncAdapter.
 */

import type { FamilyState } from "@/types"
import type { SyncAdapter } from "./adapters/types"
import { readPayload, applyPayload } from "./payload"

export type GetFamilyState = () => FamilyState
export type DispatchLoadState = (action: { type: "LOAD_STATE"; payload: FamilyState }) => void

export interface SyncResult {
  ok: boolean
  pushed?: boolean
  pulled?: boolean
  error?: string
}

/**
 * Führt einen vollen Sync durch: zuerst Push, dann Pull (Last-Write-Wins vom Server).
 */
export async function fullSync(
  adapter: SyncAdapter,
  getFamilyState: GetFamilyState,
  dispatch: DispatchLoadState,
  familyCode?: string,
): Promise<SyncResult> {
  try {
    const payload = readPayload(getFamilyState, familyCode)
    const pushResult = await adapter.push(payload)
    if (!pushResult.ok) {
      return { ok: false, error: pushResult.error }
    }
    const pullResult = await adapter.pull()
    if (!pullResult.ok) {
      return { ok: true, pushed: true, error: pullResult.error }
    }
    if (pullResult.payload) {
      applyPayload(pullResult.payload, dispatch)
    }
    return { ok: true, pushed: true, pulled: !!pullResult.payload }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Sync fehlgeschlagen" }
  }
}

/**
 * Nur hochladen (Backup).
 */
export async function pushOnly(
  adapter: SyncAdapter,
  getFamilyState: GetFamilyState,
  familyCode?: string,
): Promise<SyncResult> {
  try {
    const payload = readPayload(getFamilyState, familyCode)
    const result = await adapter.push(payload)
    return result.ok
      ? { ok: true, pushed: true }
      : { ok: false, error: result.error }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Backup fehlgeschlagen" }
  }
}

/**
 * Nur herunterladen und anwenden.
 */
export async function pullOnly(
  adapter: SyncAdapter,
  dispatch: DispatchLoadState,
): Promise<SyncResult> {
  try {
    const result = await adapter.pull()
    if (!result.ok) return { ok: false, error: result.error }
    if (result.payload) applyPayload(result.payload, dispatch)
    return { ok: true, pulled: !!result.payload }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Pull fehlgeschlagen" }
  }
}
