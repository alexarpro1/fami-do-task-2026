"use client"

/**
 * App-Update-Hook: gemeinsame Quelle ueber AppUpdateProvider
 * (Auto-Check bei Cold-Start / Resume, Force + Soft-Prompt).
 */
export { useAppUpdate, AppUpdateProvider } from "@/context/app-update-context"
export type { AppUpdateState } from "@/context/app-update-context"
