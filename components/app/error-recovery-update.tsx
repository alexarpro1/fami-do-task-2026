"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_VERSION, APP_UPDATE_DOWNLOAD_URL } from "@/lib/version"
import {
  fetchAppUpdateResultWithRetry,
  markCheckPerformed,
  type AppUpdateResult,
} from "@/lib/app-update-check"
import { openSafeUpdateUrl, resolveSafeApkDownloadUrl } from "@/lib/update-security"
import {
  detectResilientUpdateLocale,
  getResilientUpdateCopy,
} from "@/lib/resilient-update-i18n"

/**
 * Update-Aktionen ohne AppUpdateProvider / i18n / FamilyContext.
 * Fuer ErrorBoundary und kaputtes UI.
 */
export function ErrorRecoveryUpdatePanel() {
  const locale = detectResilientUpdateLocale()
  const copy = getResilientUpdateCopy(locale)
  const [checking, setChecking] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AppUpdateResult | null>(null)

  const runCheck = useCallback(async () => {
    setChecking(true)
    setError(null)
    try {
      const next = await fetchAppUpdateResultWithRetry(3)
      markCheckPerformed()
      setResult(next)
      if (!next.remoteFetched && !next.updateAvailable) {
        setError(copy.checkFailed)
      }
    } catch {
      setError(copy.checkFailed)
    } finally {
      setChecking(false)
    }
  }, [copy.checkFailed])

  const runDownload = useCallback(async () => {
    setOpening(true)
    setError(null)
    const url = resolveSafeApkDownloadUrl(
      result?.downloadUrl,
      APP_UPDATE_DOWNLOAD_URL,
    )
    const ok = await openSafeUpdateUrl(url, { maxAttempts: 3 })
    if (!ok) setError(copy.openFailed)
    setOpening(false)
  }, [copy.openFailed, result?.downloadUrl])

  useEffect(() => {
    void runCheck()
  }, [runCheck])

  const displayRemote = result?.latestVersion
    ? result.latestVersion.startsWith("V")
      ? result.latestVersion
      : `V${result.latestVersion}`
    : ""

  return (
    <div className="w-full space-y-3 rounded-xl border border-primary/30 bg-card/80 p-4 text-left">
      <p className="text-xs text-muted-foreground">
        {copy.currentVersion}: {APP_VERSION.display}
      </p>
      {result?.updateAvailable ? (
        <p className="text-sm font-medium text-primary">
          {result.forceUpdate ? copy.updateRequired : copy.updateAvailable}
          {displayRemote ? ` (${displayRemote})` : ""}
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="default"
          className="min-h-[48px] w-full gap-2"
          disabled={checking || opening}
          onClick={() => void runCheck()}
        >
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? copy.checking : copy.checkUpdates}
        </Button>
        {(result?.updateAvailable || result?.forceUpdate) && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-[48px] w-full gap-2"
            disabled={opening || checking}
            onClick={() => void runDownload()}
          >
            <Download className="h-4 w-4" />
            {opening ? copy.checking : copy.downloadInstall}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload()
          }}
        >
          {copy.reloadApp}
        </Button>
      </div>
    </div>
  )
}
