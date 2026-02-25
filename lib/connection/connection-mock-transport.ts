// ============================================
// Mock-Transport für Tests / Entwicklung
// Ersetzt echten Hub/Cloud durch sofortige Erfolge oder konfigurierbare Fehler
// ============================================

import type { ConnectionTransport } from "../../types/connection"

export interface MockTransportOptions {
  /** Wenn true, pingLocalHub() liefert immer true (Hub erreichbar). */
  localReachable?: boolean
  /** Wenn true, connectLocal() wirft nie. */
  localConnectSucceeds?: boolean
  /** Wenn true, connectCloud() wirft nie. */
  cloudConnectSucceeds?: boolean
}

/**
 * Transport-Implementierung für Tests oder UI-Entwicklung ohne echten Server.
 * Standard: Lokal erreichbar, beide Connects erfolgreich.
 */
export function createMockTransport(options: MockTransportOptions = {}): ConnectionTransport {
  const {
    localReachable = true,
    localConnectSucceeds = true,
    cloudConnectSucceeds = true,
  } = options

  return {
    async pingLocalHub() {
      return localReachable
    },
    async connectLocal() {
      if (!localConnectSucceeds) throw new Error("Mock: connectLocal failed")
    },
    async disconnectLocal() {},
    async connectCloud() {
      if (!cloudConnectSucceeds) throw new Error("Mock: connectCloud failed")
    },
    async disconnectCloud() {},
  }
}
