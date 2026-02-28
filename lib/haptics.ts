/**
 * Haptisches Feedback (Capacitor Haptics). Auf Web kein Effekt.
 * Phase 16: Web-sichere Wrapper triggerLightClick, triggerSuccess, triggerError, triggerHeavy.
 */

export async function hapticLight(): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics")
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (_) {
    // Web oder Plugin nicht verfügbar
  }
}

export async function hapticSuccess(): Promise<void> {
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics")
    await Haptics.notification({ type: NotificationType.Success })
  } catch (_) {
    await hapticLight()
  }
}

export async function hapticError(): Promise<void> {
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics")
    await Haptics.notification({ type: NotificationType.Error })
  } catch (_) {
    await hapticLight()
  }
}

/** ImpactStyle.Heavy – für destruktive Aktionen. Web-sicher (stiller Fallback). */
export async function hapticHeavy(): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics")
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch (_) {
    await hapticLight()
  }
}

/** Leichter Klick (ImpactStyle.Light). Alias für Gamification-UI. */
export async function triggerLightClick(): Promise<void> {
  await hapticLight()
}

/** Erfolg (NotificationType.Success). */
export async function triggerSuccess(): Promise<void> {
  await hapticSuccess()
}

/** Fehler/Abbruch (NotificationType.Error). */
export async function triggerError(): Promise<void> {
  await hapticError()
}

/** Starker Impuls für destruktive Aktionen. */
export async function triggerHeavy(): Promise<void> {
  await hapticHeavy()
}
