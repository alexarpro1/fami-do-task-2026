/**
 * Netzwerk-Status (Capacitor Network mit Fallback auf navigator.onLine).
 * Wird z. B. vom ConnectionManager genutzt, um bei Offline keinen Sync zu starten.
 */

export type NetworkStatus = { connected: boolean }

export type WifiOnlineCheck = {
  ok: boolean
  isNative: boolean
  connectionType?: string
}

/**
 * Aktuellen Verbindungsstatus abfragen.
 * Im Native-Kontext: @capacitor/network; im Browser: navigator.onLine.
 */
/** Fuer Downloads mit „nur WLAN“: online + auf Native bevorzugt wifi. */
export async function isWifiOrBrowserOnline(): Promise<WifiOnlineCheck> {
  if (typeof window === "undefined") {
    return { ok: false, isNative: false }
  }
  try {
    const { Network } = await import("@capacitor/network")
    const status = await Network.getStatus()
    const type = status.connectionType ?? "unknown"
    const isNative = true
    if (!status.connected) return { ok: false, isNative, connectionType: type }
    if (type === "wifi" || type === "ethernet") {
      return { ok: true, isNative, connectionType: type }
    }
    return { ok: false, isNative, connectionType: type }
  } catch {
    return { ok: navigator.onLine, isNative: false, connectionType: "browser" }
  }
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  if (typeof window === "undefined") return { connected: false }
  try {
    const { Network } = await import("@capacitor/network")
    const status = await Network.getStatus()
    return { connected: status.connected }
  } catch {
    return { connected: navigator.onLine }
  }
}

/**
 * Listener für Verbindungsänderungen (nur im Native-Kontext aktiv).
 * Ruft callback bei Wechsel (online/offline) auf.
 * Gibt eine Cleanup-Funktion zurück.
 */
export function addConnectionListener(callback: (connected: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {}

  let cancelled = false
  let removeFn: (() => void) | null = null

  const run = async () => {
    try {
      const { Network } = await import("@capacitor/network")
      const status = await Network.getStatus()
      if (!cancelled) callback(status.connected)

      const listener = await Network.addListener("networkStatusChange", (status) => {
        if (!cancelled) callback(status.connected)
      })
      removeFn = () => listener.remove()
      if (cancelled) listener.remove()
    } catch {
      if (!cancelled) callback(navigator.onLine)
      const onOnline = () => { if (!cancelled) callback(true) }
      const onOffline = () => { if (!cancelled) callback(false) }
      window.addEventListener("online", onOnline)
      window.addEventListener("offline", onOffline)
      removeFn = () => {
        window.removeEventListener("online", onOnline)
        window.removeEventListener("offline", onOffline)
      }
      if (cancelled) removeFn()
    }
  }
  run()

  return () => {
    cancelled = true
    removeFn?.()
    removeFn = null
  }
}
