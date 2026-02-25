// ============================================
// Hybrid Connection Manager – Typen
// State Machine: Offline → Local ↔ Cloud mit Hysterese
// ============================================

/**
 * Zustände der Verbindungs-State-Machine.
 * Es ist immer genau ein Zustand aktiv (lokal ODER Cloud, nicht beides parallel).
 */
export type ConnectionState =
  | "OFFLINE"
  | "CONNECTING_LOCAL"
  | "CONNECTED_LOCAL"
  | "CONNECTING_CLOUD"
  | "CONNECTED_CLOUD"

/**
 * Vereinfachter Modus für UI (z.B. Status-Icon: WLAN vs. Cloud vs. Offline).
 */
export type ConnectionMode = "local" | "cloud" | "offline"

/**
 * Konfiguration des ConnectionManagers.
 */
export interface ConnectionManagerConfig {
  /** Intervall zwischen zwei Ping-Versuchen zum lokalen Hub (ms). */
  pingIntervalMs: number
  /** Anzahl fehlgeschlagener Pings, nach der auf Cloud gewechselt wird. */
  maxFailedPings: number
  /** Mindestdauer (ms), die der Hub ununterbrochen erreichbar sein muss, bevor zurück auf Lokal gewechselt wird. */
  localStableDurationMs: number
  /** Timeout pro einzelner Ping-Anfrage (ms). */
  pingTimeoutMs: number
  /** Wird nach Wechsel in CONNECTED_LOCAL oder CONNECTED_CLOUD aufgerufen (z. B. SyncService.runReconnectSync). */
  onConnected?: (mode: "local" | "cloud") => void | Promise<void>
}

/** Standard-Konfiguration (5s Ping, 3 Fehlversuche, 30s Hysterese). */
export const DEFAULT_CONNECTION_CONFIG: ConnectionManagerConfig = {
  pingIntervalMs: 5_000,
  maxFailedPings: 3,
  localStableDurationMs: 30_000,
  pingTimeoutMs: 3_000,
}

/**
 * Transport-Strategie: vom Manager aufgerufen, Implementierung (WebSocket/Supabase) bleibt außerhalb.
 */
export interface ConnectionTransport {
  /** Prüft, ob der lokale Hub erreichbar ist. Resolve(true) = erreichbar, false/Reject = nicht erreichbar. */
  pingLocalHub(): Promise<boolean>
  /** Stellt Verbindung zum lokalen Hub her (z.B. WebSocket). Resolve bei Erfolg. */
  connectLocal(): Promise<void>
  /** Trennt die Verbindung zum lokalen Hub. */
  disconnectLocal(): Promise<void>
  /** Stellt Verbindung zur Cloud her (z.B. Supabase). Resolve bei Erfolg. */
  connectCloud(): Promise<void>
  /** Trennt die Cloud-Verbindung. */
  disconnectCloud(): Promise<void>
}
