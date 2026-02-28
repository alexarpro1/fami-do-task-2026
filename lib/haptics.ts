/**
 * Haptisches Feedback (Capacitor Haptics). Auf Web kein Effekt.
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
