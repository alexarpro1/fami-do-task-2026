import type { LocalSyncState, LocalSyncStateEvent } from "./types"

export const INITIAL_LOCAL_SYNC_STATE: LocalSyncState = {
  role: null,
  phase: "idle",
  connectionId: null,
  peer: null,
  reconnectAttempt: 0,
  error: null,
}

function invalidTransition(state: LocalSyncState, event: LocalSyncStateEvent): never {
  throw new Error(`Ungültiger Local-Sync-Übergang: ${state.phase} -> ${event.type}`)
}

export function reduceLocalSyncState(state: LocalSyncState, event: LocalSyncStateEvent): LocalSyncState {
  switch (event.type) {
    case "DISCOVER":
      if (!["idle", "error", "stopped"].includes(state.phase)) return invalidTransition(state, event)
      return { ...INITIAL_LOCAL_SYNC_STATE, role: event.role, phase: "discovering" }
    case "HOST":
      if (!["idle", "error", "stopped"].includes(state.phase)) return invalidTransition(state, event)
      return { ...INITIAL_LOCAL_SYNC_STATE, role: event.role, phase: "hosting" }
    case "CONNECT":
      if (!["idle", "discovering", "reconnecting"].includes(state.phase)) return invalidTransition(state, event)
      return { ...state, phase: "connecting", peer: event.peer, error: null }
    case "TRANSPORT_CONNECTED":
      if (!["hosting", "connecting", "reconnecting"].includes(state.phase)) return invalidTransition(state, event)
      return { ...state, phase: "pairing", connectionId: event.connectionId, error: null }
    case "PAIRING_SUCCEEDED":
      if (state.phase !== "pairing" || !state.connectionId) return invalidTransition(state, event)
      return { ...state, phase: "connected", reconnectAttempt: 0, error: null }
    case "CONNECTION_LOST":
      if (!["pairing", "connected", "connecting"].includes(state.phase)) return invalidTransition(state, event)
      return {
        ...state,
        phase: state.role === "child" && state.peer ? "reconnecting" : "hosting",
        connectionId: null,
        error: event.reason ?? null,
      }
    case "RETRY":
      if (state.phase !== "reconnecting") return invalidTransition(state, event)
      return { ...state, reconnectAttempt: event.attempt, error: null }
    case "FAIL":
      return { ...state, phase: "error", connectionId: null, error: event.error }
    case "RESET":
      return { ...INITIAL_LOCAL_SYNC_STATE }
    case "STOP":
      return { ...INITIAL_LOCAL_SYNC_STATE, phase: "stopped" }
  }
}

export function reconnectDelayMs(attempt: number, random = Math.random): number {
  const boundedAttempt = Math.max(0, Math.min(attempt, 8))
  const base = Math.min(30_000, 500 * 2 ** boundedAttempt)
  return Math.round(base * (0.8 + random() * 0.4))
}
