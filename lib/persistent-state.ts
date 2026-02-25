/**
 * Persistenz des App-State: auf dem Gerät (Android/iOS) über Capacitor Preferences,
 * im Browser über localStorage. So bleiben die Daten beim Neustart der App erhalten.
 */

const STORAGE_KEY = "famiapp-state"

export type GetSetState = {
  get(): Promise<string | null>
  set(value: string): Promise<void>
}

async function getFromPreferences(): Promise<string | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const { value } = await Preferences.get({ key: STORAGE_KEY })
    return value
  } catch {
    return null
  }
}

async function setInPreferences(value: string): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences")
    await Preferences.set({ key: STORAGE_KEY, value })
  } catch (e) {
    console.error("[persistent-state] Preferences.set failed:", e)
  }
}

function isNative(): boolean {
  if (typeof window === "undefined") return false
  return !!(window as any).Capacitor
}

/**
 * Liest den gespeicherten State: auf Native aus Preferences, sonst aus localStorage.
 */
export async function getPersistedStateRaw(): Promise<string | null> {
  if (typeof window === "undefined") return null
  if (isNative()) return getFromPreferences()
  return localStorage.getItem(STORAGE_KEY)
}

/**
 * Speichert den State: immer in localStorage (für Web), auf Native zusätzlich in Preferences.
 */
export async function setPersistedStateRaw(value: string): Promise<void> {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch (e) {
    console.error("[persistent-state] localStorage.setItem failed:", e)
  }
  if (isNative()) await setInPreferences(value)
}

export { STORAGE_KEY }
