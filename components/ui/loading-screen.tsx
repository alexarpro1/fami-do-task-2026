"use client"

import { useTranslation } from "@/hooks/use-translation"

/** Mindestanzeige des Splash in ms (auch wenn State schon geladen ist). */
export const SPLASH_MIN_MS = 2400

/**
 * Marken-Splash beim App-Start (werblich, leichtgewichtig – CSS only).
 */
export function LoadingScreen() {
  const { translate } = useTranslation()

  return (
    <div
      className="fdt-splash fixed inset-0 z-[100] flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-background"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right, 0px))",
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={translate("compSplash.loading")}
    >
      <div className="relative z-[1] flex w-full max-w-sm flex-col items-center text-center">
        <div className="fdt-splash__logo-wrap">
          <img
            src="/icon.png"
            alt="FamiDo Task"
            width={176}
            height={176}
            className="fdt-splash__logo h-40 w-40 max-w-[70vw] rounded-[1.75rem] object-contain sm:h-44 sm:w-44 animate-bounce-in"
            draggable={false}
          />
        </div>

        <h1
          suppressHydrationWarning
          className="fdt-splash__title mt-6 font-[var(--font-fredoka)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          FamiDo Task
        </h1>
        <p
          suppressHydrationWarning
          className="fdt-splash__tagline mt-1.5 max-w-[16rem] text-sm font-medium text-muted-foreground sm:text-[15px]"
        >
          {translate("compSplash.tagline")}
        </p>

        <div className="fdt-splash__bar mt-8 h-1 w-36 overflow-hidden rounded-full bg-muted/80 sm:w-44">
          <div className="fdt-splash__bar-fill h-full rounded-full bg-primary animate-pulse" />
        </div>
        <p suppressHydrationWarning className="fdt-splash__loading mt-3 text-xs font-medium text-muted-foreground">
          {translate("compSplash.loading")}
        </p>
      </div>
    </div>
  )
}
