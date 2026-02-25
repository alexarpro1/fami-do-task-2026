// ============================================
// Connection Manager – State Machine
// Offline → Local ↔ Cloud mit Ping-Logik und 30s-Hysterese
// ============================================

import type {
  ConnectionState,
  ConnectionManagerConfig,
  ConnectionTransport,
} from "../../types/connection"
import { DEFAULT_CONNECTION_CONFIG } from "../../types/connection"
import { useConnectionStore } from "./connection-store"

const LOG_PREFIX = "[ConnectionManager]"

export class ConnectionManager {
  private config: ConnectionManagerConfig
  private transport: ConnectionTransport
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private hysteresisTimer: ReturnType<typeof setTimeout> | null = null
  private failedPingCount = 0
  private localStableStart: number | null = null
  private stopped = false

  constructor(
    transport: ConnectionTransport,
    config: Partial<ConnectionManagerConfig> = {}
  ) {
    this.transport = transport
    this.config = { ...DEFAULT_CONNECTION_CONFIG, ...config }
  }

  /** Startet den Manager: versucht zuerst den lokalen Hub, bei Fehlern Wechsel zur Cloud. */
  async start(): Promise<void> {
    if (this.stopped) return
    useConnectionStore.getState().setState("CONNECTING_LOCAL")
    try {
      await this.transport.connectLocal()
      this.transitionTo("CONNECTED_LOCAL")
      this.failedPingCount = 0
      this.localStableStart = null
      this.schedulePing()
      await this.config.onConnected?.("local")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      useConnectionStore.getState().setLastError(msg)
      console.warn(LOG_PREFIX, "Local connect failed, switching to cloud:", msg)
      await this.switchToCloud()
    }
  }

  /** Stoppt den Manager und alle Timer. */
  async stop(): Promise<void> {
    this.stopped = true
    this.clearPingTimer()
    this.clearHysteresisTimer()
    try {
      await this.transport.disconnectLocal()
      await this.transport.disconnectCloud()
    } catch (e) {
      console.warn(LOG_PREFIX, "Stop disconnect error:", e)
    }
    useConnectionStore.getState().reset()
  }

  /** Einmaliger Ping-Zyklus (vom Timer oder manuell). */
  private async runPing(): Promise<void> {
    if (this.stopped) return

    const currentState = useConnectionStore.getState().state
    const isPingingForLocal = currentState === "CONNECTED_LOCAL"
    const isPingingForCloud = currentState === "CONNECTED_CLOUD"
    if (!isPingingForLocal && !isPingingForCloud) {
      return
    }

    try {
      const ok = await this.withTimeout(
        this.transport.pingLocalHub(),
        this.config.pingTimeoutMs
      )
      if (!ok) throw new Error("Ping returned false")

      useConnectionStore.getState().setLastPingAt(Date.now())
      useConnectionStore.getState().setLastError(null)
      this.failedPingCount = 0

      if (currentState === "CONNECTED_LOCAL") {
        this.schedulePing()
        return
      }

      // Wir sind in CONNECTED_CLOUD und der Hub ist wieder erreichbar → Hysterese prüfen
      const now = Date.now()
      if (this.localStableStart === null) {
        this.localStableStart = now
      }
      const elapsed = now - this.localStableStart
      if (elapsed >= this.config.localStableDurationMs) {
        this.clearHysteresisTimer()
        this.localStableStart = null
        console.log(LOG_PREFIX, "Local hub stable for", this.config.localStableDurationMs, "ms, switching back to local")
        await this.switchToLocal()
      } else {
        this.schedulePing()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.failedPingCount += 1
      useConnectionStore.getState().setLastError(msg)

      if (currentState === "CONNECTED_LOCAL") {
        if (this.failedPingCount >= this.config.maxFailedPings) {
          console.warn(LOG_PREFIX, "Max failed pings reached, switching to cloud")
          await this.switchToCloud()
        } else {
          this.schedulePing()
        }
      } else {
        // CONNECTED_CLOUD: Hub wieder nicht erreichbar → Hysterese zurücksetzen
        this.localStableStart = null
        this.schedulePing()
      }
    }
  }

  private schedulePing(): void {
    this.clearPingTimer()
    if (this.stopped) return
    this.pingTimer = setInterval(() => {
      this.runPing()
    }, this.config.pingIntervalMs)
  }

  private clearPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private clearHysteresisTimer(): void {
    if (this.hysteresisTimer) {
      clearTimeout(this.hysteresisTimer)
      this.hysteresisTimer = null
    }
  }

  private transitionTo(state: ConnectionState): void {
    useConnectionStore.getState().setState(state)
  }

  private async switchToCloud(): Promise<void> {
    this.clearPingTimer()
    this.clearHysteresisTimer()
    this.localStableStart = null
    try {
      await this.transport.disconnectLocal()
    } catch (e) {
      console.warn(LOG_PREFIX, "Disconnect local error:", e)
    }
    this.transitionTo("CONNECTING_CLOUD")
    try {
      await this.transport.connectCloud()
      this.transitionTo("CONNECTED_CLOUD")
      this.failedPingCount = 0
      this.schedulePing()
      await this.config.onConnected?.("cloud")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      useConnectionStore.getState().setLastError(msg)
      this.transitionTo("OFFLINE")
      console.error(LOG_PREFIX, "Cloud connect failed:", msg)
    }
  }

  private async switchToLocal(): Promise<void> {
    this.clearPingTimer()
    try {
      await this.transport.disconnectCloud()
    } catch (e) {
      console.warn(LOG_PREFIX, "Disconnect cloud error:", e)
    }
    this.transitionTo("CONNECTING_LOCAL")
    try {
      await this.transport.connectLocal()
      this.transitionTo("CONNECTED_LOCAL")
      this.failedPingCount = 0
      this.localStableStart = null
      this.schedulePing()
      await this.config.onConnected?.("local")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      useConnectionStore.getState().setLastError(msg)
      this.transitionTo("CONNECTED_CLOUD")
      this.schedulePing()
      console.warn(LOG_PREFIX, "Local connect failed, staying on cloud:", msg)
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("Ping timeout")), ms)
      promise.then(
        (v) => {
          clearTimeout(t)
          resolve(v)
        },
        (e) => {
          clearTimeout(t)
          reject(e)
        }
      )
    })
  }
}
