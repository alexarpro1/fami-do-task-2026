/**
 * Einziger Sync-Manager – zentrale Stelle für alle Sync-Logik.
 * Neue Struktur, neue Logik und Funktionen. Keine WLAN/Cloud-Legacy.
 *
 * Minimale API zum Erweitern:
 * - init(): einmalig beim App-Start
 * - connect(): Verbindung herstellen (später: z.B. lokales Netz, QR, …)
 * - disconnect(): Verbindung trennen
 * - send(data): Daten an verbundene Geräte/Backend senden
 * - onData(callback): eingehende Sync-Daten empfangen
 */

export type SyncManagerStatus = "disconnected" | "connecting" | "connected" | "error"

export interface SyncManagerOptions {
  onStatusChange?: (status: SyncManagerStatus) => void
  onError?: (error: Error) => void
}

export class SyncManager {
  private status: SyncManagerStatus = "disconnected"
  private options: SyncManagerOptions
  private dataListeners: Array<(data: unknown) => void> = []

  constructor(options: SyncManagerOptions = {}) {
    this.options = options
  }

  getStatus(): SyncManagerStatus {
    return this.status
  }

  private setStatus(status: SyncManagerStatus) {
    if (this.status === status) return
    this.status = status
    this.options.onStatusChange?.(status)
  }

  /** Einmalig beim App-Start aufrufen */
  async init(): Promise<void> {
    this.setStatus("disconnected")
    // Hier später: Persistenz, Konfiguration, etc.
  }

  /** Verbindung herstellen (später mit konkreter Transport-Logik) */
  async connect(): Promise<void> {
    if (this.status === "connected" || this.status === "connecting") return
    this.setStatus("connecting")
    try {
      // Platzhalter – hier später echte Verbindungslogik
      this.setStatus("disconnected")
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.options.onError?.(error)
      this.setStatus("error")
      throw error
    }
  }

  /** Verbindung trennen */
  async disconnect(): Promise<void> {
    this.setStatus("disconnected")
  }

  /** Daten senden (an verbundene Geräte / Backend) */
  async send(data: unknown): Promise<void> {
    if (this.status !== "connected") {
      return
    }
    // Platzhalter – hier später echte Sendelogik
    void data
  }

  /** Callback für eingehende Sync-Daten registrieren */
  onData(callback: (data: unknown) => void): () => void {
    this.dataListeners.push(callback)
    return () => {
      this.dataListeners = this.dataListeners.filter((cb) => cb !== callback)
    }
  }

  /** Intern: eingehende Daten an alle Listener verteilen */
  protected notifyData(data: unknown): void {
    for (const cb of this.dataListeners) {
      try {
        cb(data)
      } catch (e) {
        this.options.onError?.(e instanceof Error ? e : new Error(String(e)))
      }
    }
  }
}

/** Singleton-Instanz für die App */
let defaultInstance: SyncManager | null = null

export function getSyncManager(options?: SyncManagerOptions): SyncManager {
  if (!defaultInstance) {
    defaultInstance = new SyncManager(options)
  }
  return defaultInstance
}
