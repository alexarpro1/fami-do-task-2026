// ============================================
// Connection Store (Zustand)
// Reaktiver State für ConnectionManager – nur Abonnenten re-rendern
// ============================================

import { create } from "zustand"
import type { ConnectionState, ConnectionMode } from "../../types/connection"

function stateToMode(state: ConnectionState): ConnectionMode {
  switch (state) {
    case "CONNECTED_LOCAL":
    case "CONNECTING_LOCAL":
      return "local"
    case "CONNECTED_CLOUD":
    case "CONNECTING_CLOUD":
      return "cloud"
    default:
      return "offline"
  }
}

export interface ConnectionStoreState {
  /** Aktueller Zustand der State-Machine. */
  state: ConnectionState
  /** Vereinfacht für UI: local | cloud | offline. */
  mode: ConnectionMode
  /** Letzter Fehler (z.B. Ping-Fehler oder Cloud-Connect). */
  lastError: string | null
  /** Zeitpunkt des letzten erfolgreichen Pings (ms), für Debug/Anzeige. */
  lastPingAt: number | null
}

export interface ConnectionStoreActions {
  setState: (state: ConnectionState) => void
  setLastError: (error: string | null) => void
  setLastPingAt: (at: number | null) => void
  reset: () => void
}

const initialState: ConnectionStoreState = {
  state: "OFFLINE",
  mode: "offline",
  lastError: null,
  lastPingAt: null,
}

export const useConnectionStore = create<ConnectionStoreState & ConnectionStoreActions>((set) => ({
  ...initialState,

  setState: (state) =>
    set({
      state,
      mode: stateToMode(state),
      ...((state === "CONNECTED_LOCAL" || state === "CONNECTED_CLOUD") ? { lastError: null } : {}),
    }),

  setLastError: (lastError) => set({ lastError }),

  setLastPingAt: (lastPingAt) => set({ lastPingAt }),

  reset: () => set(initialState),
}))

// ---------- Selektoren (für gezielte Re-Renders) ----------

/** Nur State abonnieren – Komponente rendert nur bei Zustandswechsel. */
export const useConnectionState = () => useConnectionStore((s) => s.state)

/** Nur Mode abonnieren – z.B. für Status-Icon (🟢 WLAN / 🔵 Cloud / ⚫ Offline). */
export const useConnectionMode = () => useConnectionStore((s) => s.mode)

/** Nur Fehler abonnieren – z.B. für Fehler-Banner. */
export const useConnectionLastError = () => useConnectionStore((s) => s.lastError)

/** Ist aktuell eine Verbindung aktiv (lokal oder Cloud)? */
export const useConnectionActive = () =>
  useConnectionStore((s) => s.state === "CONNECTED_LOCAL" || s.state === "CONNECTED_CLOUD")

/** Ist der lokale Hub verbunden? */
export const useConnectionLocal = () => useConnectionStore((s) => s.state === "CONNECTED_LOCAL")

/** Ist die Cloud verbunden? */
export const useConnectionCloud = () => useConnectionStore((s) => s.state === "CONNECTED_CLOUD")
