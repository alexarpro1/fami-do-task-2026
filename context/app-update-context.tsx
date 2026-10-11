"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  fetchAppUpdateResultWithRetry,
  markAutoOpenedVersion,
  markCheckPerformed,
  markNotifiedVersion,
  markSoftDismissedVersion,
  shouldAutoOpenForceDownload,
  shouldRunUpdateCheck,
  shouldShowSoftPrompt,
  type AppUpdateResult,
  type UpdateCheckReason,
  UPDATE_CHECK_MAX_STALE_MS,
} from "@/lib/app-update-check"
import { APP_UPDATE_DOWNLOAD_URL } from "@/lib/version"
import { openSafeUpdateUrl, resolveSafeApkDownloadUrl } from "@/lib/update-security"
import { MANUAL_UPDATE_CHECK_EVENT } from "@/lib/sync-v2/version-client"
import type { UpdateInfo } from "@/lib/sync-v2/version-client"

export interface AppUpdateState extends AppUpdateResult {
  loading: boolean
  softPromptOpen: boolean
  checkNow: (reason?: UpdateCheckReason) => Promise<AppUpdateResult | null>
  openDownload: () => Promise<boolean>
  dismissSoftPrompt: () => void
  showSoftPrompt: () => void
}

const defaultResult: AppUpdateResult = {
  updateAvailable: false,
  latestVersion: "",
  downloadUrl: APP_UPDATE_DOWNLOAD_URL,
  forceUpdate: false,
  apkSha256: "",
  label: "",
  remoteFetched: false,
}

const AppUpdateContext = createContext<AppUpdateState | null>(null)

function resultToManualEvent(result: AppUpdateResult): UpdateInfo {
  const parts = result.latestVersion.split(".").map((x) => parseInt(x, 10))
  const remote =
    parts.length === 4 && parts.every((n) => Number.isFinite(n))
      ? {
          major: parts[0]!,
          minor: parts[1]!,
          patch: parts[2]!,
          build: parts[3]!,
          apkSha256: result.apkSha256 || undefined,
          apkUrl: result.downloadUrl,
        }
      : null
  return {
    available: result.updateAvailable,
    remote,
    label: result.label || (result.latestVersion ? `V${result.latestVersion}` : ""),
    updateUrl: result.downloadUrl,
  }
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AppUpdateResult>(defaultResult)
  const [loading, setLoading] = useState(true)
  const [softPromptOpen, setSoftPromptOpen] = useState(false)
  const inflightRef = useRef<Promise<AppUpdateResult | null> | null>(null)
  const resultRef = useRef(result)
  resultRef.current = result
  const mountedRef = useRef(true)

  const applySideEffects = useCallback(async (next: AppUpdateResult) => {
    if (next.forceUpdate && shouldAutoOpenForceDownload(next)) {
      markAutoOpenedVersion(next.latestVersion)
      await openSafeUpdateUrl(next.downloadUrl)
    }

    if (shouldShowSoftPrompt(next)) {
      markNotifiedVersion(next.latestVersion)
      setSoftPromptOpen(true)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MANUAL_UPDATE_CHECK_EVENT, { detail: resultToManualEvent(next) }),
        )
      }
    } else if (next.updateAvailable && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(MANUAL_UPDATE_CHECK_EVENT, { detail: resultToManualEvent(next) }),
      )
    }
  }, [])

  const checkNow = useCallback(
    async (reason: UpdateCheckReason = "manual"): Promise<AppUpdateResult | null> => {
      if (reason !== "manual" && !shouldRunUpdateCheck(reason)) {
        return resultRef.current
      }
      if (inflightRef.current) {
        // Manuell: auf laufenden Check warten statt null
        if (reason === "manual") return inflightRef.current
        return null
      }
      if (reason === "manual" || reason === "cold") setLoading(true)
      const run = (async (): Promise<AppUpdateResult | null> => {
        try {
          const next = await fetchAppUpdateResultWithRetry(3)
          markCheckPerformed()
          if (!mountedRef.current) return next
          setResult(next)
          await applySideEffects(next)
          return next
        } catch {
          return null
        } finally {
          inflightRef.current = null
          if (mountedRef.current) setLoading(false)
        }
      })()
      inflightRef.current = run
      return run
    },
    [applySideEffects],
  )

  const openDownload = useCallback(async () => {
    const url = resolveSafeApkDownloadUrl(result.downloadUrl, APP_UPDATE_DOWNLOAD_URL)
    return openSafeUpdateUrl(url)
  }, [result.downloadUrl])

  const dismissSoftPrompt = useCallback(() => {
    if (result.latestVersion) markSoftDismissedVersion(result.latestVersion)
    setSoftPromptOpen(false)
  }, [result.latestVersion])

  const showSoftPrompt = useCallback(() => {
    if (result.updateAvailable && !result.forceUpdate) setSoftPromptOpen(true)
  }, [result.forceUpdate, result.updateAvailable])

  useEffect(() => {
    mountedRef.current = true
    void checkNow("cold")

    const onResume = () => {
      void checkNow("resume")
    }

    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void checkNow("resume")
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", onResume)

    let removeCap: { remove: () => Promise<void> } | undefined
    void import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) onResume()
        }),
      )
      .then((handle) => {
        removeCap = handle
      })
      .catch(() => {})

    const intervalId = window.setInterval(() => {
      void checkNow("interval")
    }, Math.min(UPDATE_CHECK_MAX_STALE_MS, 60 * 60 * 1000))

    return () => {
      mountedRef.current = false
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("focus", onResume)
      window.clearInterval(intervalId)
      void removeCap?.remove()
    }
    // cold start once; checkNow identity may change — mount-only listeners
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<AppUpdateState>(
    () => ({
      ...result,
      loading,
      softPromptOpen,
      checkNow,
      openDownload,
      dismissSoftPrompt,
      showSoftPrompt,
    }),
    [
      result,
      loading,
      softPromptOpen,
      checkNow,
      openDownload,
      dismissSoftPrompt,
      showSoftPrompt,
    ],
  )

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>
}

export function useAppUpdate(): AppUpdateState {
  const ctx = useContext(AppUpdateContext)
  if (!ctx) {
    // Fallback ohne Provider (Tests / Legacy): minimale Defaults
    return {
      ...defaultResult,
      loading: false,
      softPromptOpen: false,
      checkNow: async () => null,
      openDownload: async () => false,
      dismissSoftPrompt: () => {},
      showSoftPrompt: () => {},
    }
  }
  return ctx
}
