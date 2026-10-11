import { registerPlugin, Capacitor } from "@capacitor/core"

const PREF_BACK_BUTTON_BLOCK_START = "famiapp_back_button_block_start"

export interface KioskPluginInterface {
  openHomeSettings(): Promise<void>
  openApplicationDetailsSettings(): Promise<void>
}

const Kiosk = registerPlugin<KioskPluginInterface>("Kiosk")

/** Aktiviert: Auf Startseite verhindert der Zurück-Button das Schließen der App (Kiosk). */
export async function getBackButtonBlockEnabled(): Promise<boolean> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return false
  }
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const { value } = await Preferences.get({ key: PREF_BACK_BUTTON_BLOCK_START })
    return value !== "false"
  } catch {
    return true
  }
}

export async function setBackButtonBlockEnabled(enabled: boolean): Promise<void> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return
  }
  try {
    const { Preferences } = await import("@capacitor/preferences")
    await Preferences.set({ key: PREF_BACK_BUTTON_BLOCK_START, value: enabled ? "true" : "false" })
  } catch (e) {
    console.error("[Kiosk] setBackButtonBlockEnabled failed:", e)
  }
}

/**
 * Öffnet die Android Home/Launcher-Einstellungen (Notausgang für Kiosk-Modus).
 * Nur auf Android in der nativen App wirksam; auf Web/iOS wird ein Hinweis geloggt.
 */
export async function openHomeSettings(): Promise<void> {
  if (typeof window === "undefined") return
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    console.warn("[Kiosk] openHomeSettings ist nur auf Android (native App) verfügbar.")
    return
  }
  await Kiosk.openHomeSettings()
}

/**
 * Öffnet Android „App-Info“ (Berechtigungen etc.) für diese App.
 * Nur native Android; sonst no-op.
 */
export async function openAndroidApplicationDetailsSettings(): Promise<void> {
  if (typeof window === "undefined") return
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    console.warn("[Kiosk] openApplicationDetailsSettings ist nur auf Android (native App) verfügbar.")
    return
  }
  await Kiosk.openApplicationDetailsSettings()
}
