/**
 * Geräte-Schlüssel/Wert-Speicher: Web = localStorage,
 * Native (Capacitor) = localStorage + Preferences (überlebt App-Neustart zuverlässiger).
 */

function isNative(): boolean {
  if (typeof window === "undefined") return false
  return !!(window as Window & { Capacitor?: unknown }).Capacitor
}

async function preferencesGet(key: string): Promise<string | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const { value } = await Preferences.get({ key })
    return value ?? null
  } catch {
    return null
  }
}

async function preferencesSet(key: string, value: string): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences")
    await Preferences.set({ key, value })
  } catch (e) {
    console.error("[device-kv] Preferences.set failed:", key, e)
  }
}

/** Synchron aus localStorage (für Erst-Render). */
export function getDeviceKvSync(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Synchron in localStorage; auf Native zusätzlich Preferences (async). */
export function setDeviceKvSync(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    console.error("[device-kv] localStorage.setItem failed:", key, e)
  }
  if (isNative()) {
    void preferencesSet(key, value)
  }
}

/** Liest: Native zuerst Preferences, sonst localStorage. */
export async function getDeviceKv(key: string): Promise<string | null> {
  if (typeof window === "undefined") return null
  if (isNative()) {
    const fromPrefs = await preferencesGet(key)
    if (fromPrefs != null) return fromPrefs
  }
  return getDeviceKvSync(key)
}

/** Speichert in localStorage und ggf. Preferences. */
export async function setDeviceKv(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    console.error("[device-kv] localStorage.setItem failed:", key, e)
  }
  if (isNative()) await preferencesSet(key, value)
}

export function removeDeviceKvSync(key: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  if (isNative()) {
    void import("@capacitor/preferences")
      .then(({ Preferences }) => Preferences.remove({ key }))
      .catch(() => {})
  }
}
