/**
 * Device and Native App Utilities
 * Provides device ID management and native feature detection
 */

let deviceId: string | null = null

/**
 * Get or create unique device ID
 * Used for multi-device sync identification
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server"

  if (deviceId) return deviceId

  // Try to get from localStorage
  const stored = localStorage.getItem("famiapp_device_id")
  if (stored) {
    deviceId = stored
    return deviceId
  }

  // Generate new ID
  const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  localStorage.setItem("famiapp_device_id", newId)
  deviceId = newId

  return deviceId
}

/**
 * Get device name (user can customize this)
 */
export function getDeviceName(): string {
  if (typeof window === "undefined") return "Server"

  const stored = localStorage.getItem("famiapp_device_name")
  if (stored) return stored

  // Generate default name based on platform
  const platform = /iPhone|iPad|iPod/.test(navigator.userAgent)
    ? "iPhone"
    : /Android/.test(navigator.userAgent)
      ? "Android"
      : "Desktop"
  const name = `${platform} Gerät`

  return name
}

/**
 * Set custom device name
 */
export function setDeviceName(name: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("famiapp_device_name", name)
}

/**
 * Check if running in Capacitor (native app)
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false
  return !!(window as any).Capacitor
}

/**
 * Open QR Scanner (Web-based)
 * Works in both browser and native app
 */
export async function openQRScanner(
  onSuccess: (decodedText: string) => void,
  onError?: (error: string) => void,
): Promise<void> {
  try {
    const { Html5Qrcode } = await import("html5-qrcode")

    // Create scanner container
    const scannerId = "qr-scanner-container"
    let scannerDiv = document.getElementById(scannerId)

    if (!scannerDiv) {
      scannerDiv = document.createElement("div")
      scannerDiv.id = scannerId
      scannerDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `
      document.body.appendChild(scannerDiv)
    }

    // Create close button
    const closeBtn = document.createElement("button")
    closeBtn.textContent = "✕ Schließen"
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      z-index: 10000;
    `
    scannerDiv.appendChild(closeBtn)

    // Create scanner element
    const scannerElement = document.createElement("div")
    scannerElement.id = "qr-reader"
    scannerElement.style.cssText = `
      width: 90%;
      max-width: 500px;
      border-radius: 12px;
      overflow: hidden;
    `
    scannerDiv.appendChild(scannerElement)

    const html5QrCode = new Html5Qrcode("qr-reader")
    let resolved = false

    const cleanup = () => {
      if (!resolved) {
        resolved = true
        html5QrCode
          .stop()
          .then(() => {
            scannerDiv?.remove()
          })
          .catch(() => {
            scannerDiv?.remove()
          })
      }
    }

    closeBtn.onclick = () => {
      cleanup()
    }

    html5QrCode
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          console.log("[v0] QR code scanned:", decodedText.substring(0, 50) + "...")
          cleanup()
          onSuccess(decodedText)
        },
        () => {
          // Ignore scanning errors
        },
      )
      .catch((error) => {
        console.error("[v0] QR-Scanner error:", error)
        cleanup()
        if (onError) {
          onError(error.message || "Scanner konnte nicht gestartet werden")
        }
      })
  } catch (error: any) {
    console.error("[v0] QR-Scanner initialization error:", error)
    if (onError) {
      onError(error.message || "Scanner konnte nicht initialisiert werden")
    }
  }
}

/**
 * Get platform info
 */
export function getPlatform(): {
  isIOS: boolean
  isAndroid: boolean
  isWeb: boolean
  isNative: boolean
} {
  if (typeof window === "undefined") {
    return { isIOS: false, isAndroid: false, isWeb: true, isNative: false }
  }

  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isNative = isNativeApp()

  return {
    isIOS,
    isAndroid,
    isWeb: !isNative,
    isNative,
  }
}

/**
 * Get hardware device ID with UUID fallback
 * Uses Capacitor Device plugin for native hardware ID
 * Falls back to generated UUID for web or if hardware ID unavailable
 */
export async function getHardwareDeviceId(): Promise<string> {
  if (typeof window === "undefined") return "server"

  try {
    const { Preferences } = await import("@capacitor/preferences")
    const stored = await Preferences.get({ key: "famiapp_device_id" })
    if (stored.value) {
      deviceId = stored.value
      return deviceId
    }
  } catch {
    // Preferences not available, continue
  }

  try {
    if (isNativeApp()) {
      const { Device } = await import("@capacitor/core")
      const info = await Device.getId()
      if (info.identifier) {
        deviceId = `hw_${info.identifier}`
        // Save to Preferences for future use
        try {
          const { Preferences } = await import("@capacitor/preferences")
          await Preferences.set({ key: "famiapp_device_id", value: deviceId })
        } catch {
          // Ignore save errors
        }
        return deviceId
      }
    }
  } catch {
    // Hardware ID not available, fall back to UUID
  }

  const uuid = `uuid_${crypto.randomUUID()}`
  deviceId = uuid

  try {
    const { Preferences } = await import("@capacitor/preferences")
    await Preferences.set({ key: "famiapp_device_id", value: uuid })
  } catch {
    // If Preferences fails, try localStorage
    try {
      localStorage.setItem("famiapp_device_id", uuid)
    } catch {
      // Ignore storage errors
    }
  }

  return deviceId
}
