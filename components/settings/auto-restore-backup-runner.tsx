"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useFamily } from "@/context/family-context"
import { useTranslation } from "@/hooks/use-translation"
import {
  applyRestoreCandidate,
  findRestoreCandidate,
  isEffectivelyEmptyFamilyState,
  setAutoRestoreSkipped,
  wasAutoRestoreSkipped,
  type RestoreCandidate,
} from "@/lib/auto-restore-backup"
import { isNativeApp } from "@/lib/device"
import { getPersistedStateRaw } from "@/lib/persistent-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const PREF_HAD_FAMILY_DATA = "famiapp_had_family_data_v1"

async function getHadFamilyData(): Promise<boolean> {
  try {
    if (isNativeApp()) {
      const { Preferences } = await import("@capacitor/preferences")
      const { value } = await Preferences.get({ key: PREF_HAD_FAMILY_DATA })
      return value === "1"
    }
    return localStorage.getItem(PREF_HAD_FAMILY_DATA) === "1"
  } catch {
    return false
  }
}

async function markHadFamilyData(): Promise<void> {
  try {
    if (isNativeApp()) {
      const { Preferences } = await import("@capacitor/preferences")
      await Preferences.set({ key: PREF_HAD_FAMILY_DATA, value: "1" })
      return
    }
    localStorage.setItem(PREF_HAD_FAMILY_DATA, "1")
  } catch {
    // ignore
  }
}

/**
 * Nach Neuinstallation: Backup in Dokumente/FamiDoBackup (oder Notfall-LS) finden
 * und bei leerem State automatisch wiederherstellen.
 */
export function AutoRestoreBackupRunner() {
  const { state, dispatch, isLoaded } = useFamily()
  const { translate } = useTranslation()
  const didScan = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const [candidate, setCandidate] = useState<RestoreCandidate | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneInfo, setDoneInfo] = useState<{ childrenCount: number; filename: string } | null>(null)

  const restore = useCallback(
    async (c: RestoreCandidate) => {
      setBusy(true)
      setError(null)
      try {
        const result = applyRestoreCandidate(c, stateRef.current)
        if (!result.success || !result.state) {
          setError(result.error || translate("modalAutoRestore.error"))
          setBusy(false)
          return
        }
        dispatch({ type: "LOAD_STATE", payload: result.state })
        await markHadFamilyData()
        await setAutoRestoreSkipped(true)
        setCandidate(null)
        setOpen(false)
        setDoneInfo({ childrenCount: c.childrenCount, filename: c.filename })
      } catch (e) {
        setError(e instanceof Error ? e.message : translate("modalAutoRestore.error"))
      } finally {
        setBusy(false)
      }
    },
    [dispatch, translate],
  )

  // Merken, sobald echte Familiendaten vorhanden sind (verhindert Re-Import nach manuellem Leeren)
  useEffect(() => {
    if (!isLoaded) return
    if (!isEffectivelyEmptyFamilyState(state)) {
      void markHadFamilyData()
    }
  }, [isLoaded, state])

  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded || didScan.current) return

    const timer = window.setTimeout(() => {
      void (async () => {
        if (didScan.current) return
        didScan.current = true

        try {
          if (await wasAutoRestoreSkipped()) return
          if (await getHadFamilyData()) return

          // Native: auf Preferences-Hydration warten und dort prüfen
          if (isNativeApp()) {
            const raw = await getPersistedStateRaw()
            if (raw) {
              try {
                const parsed = JSON.parse(raw) as { children?: unknown[] }
                if (Array.isArray(parsed?.children) && parsed.children.length > 0) {
                  await markHadFamilyData()
                  return
                }
              } catch {
                // ignore corrupt store
              }
            }
          }

          if (!isEffectivelyEmptyFamilyState(state)) {
            await markHadFamilyData()
            return
          }

          const found = await findRestoreCandidate()
          if (!found) return

          setCandidate(found)
          setOpen(true)
          // Automatisch übernehmen (Neuinstallation + Backup vorhanden)
          await restore(found)
        } catch (e) {
          console.warn("[AutoRestoreBackupRunner]", e)
        }
      })()
    }, 2200)

    return () => window.clearTimeout(timer)
    // Nur einmal nach Laden scannen; restore/state absichtlich nicht in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded])

  const onDismiss = async () => {
    await setAutoRestoreSkipped(true)
    setOpen(false)
    setCandidate(null)
    setDoneInfo(null)
  }

  return (
    <>
      <Dialog open={open && !!candidate && !doneInfo} onOpenChange={(v) => !v && void onDismiss()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translate("modalAutoRestore.title")}</DialogTitle>
            <DialogDescription className="sr-only">
              {translate("modalAutoRestore.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{translate("modalAutoRestore.description")}</p>
            {candidate && (
              <>
                <p>
                  {translate("modalAutoRestore.fileLabel")}{" "}
                  <span className="font-medium text-foreground break-all">{candidate.filename}</span>
                </p>
                <p>
                  {translate("modalAutoRestore.childrenLabel", {
                    count: String(candidate.childrenCount),
                  })}
                </p>
              </>
            )}
            {error && <p className="text-destructive">{error}</p>}
            {busy && <p>{translate("modalAutoRestore.restoring")}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void onDismiss()}>
              {translate("modalAutoRestore.notNow")}
            </Button>
            <Button
              type="button"
              disabled={busy || !candidate}
              onClick={() => candidate && void restore(candidate)}
            >
              {translate("modalAutoRestore.restore")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!doneInfo} onOpenChange={(v) => !v && setDoneInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translate("modalAutoRestore.successTitle")}</DialogTitle>
            <DialogDescription className="sr-only">
              {translate("modalAutoRestore.successBody", {
                count: String(doneInfo?.childrenCount ?? 0),
                file: doneInfo?.filename ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {translate("modalAutoRestore.successBody", {
              count: String(doneInfo?.childrenCount ?? 0),
              file: doneInfo?.filename ?? "",
            })}
          </p>
          <DialogFooter>
            <Button type="button" onClick={() => setDoneInfo(null)}>
              {translate("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
