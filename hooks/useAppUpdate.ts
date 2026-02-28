"use client"

import { useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { APP_VERSION, APP_UPDATE_DOWNLOAD_URL } from "@/lib/version"
import { compareVersions } from "@/lib/version-compare"

export interface AppUpdateState {
  updateAvailable: boolean
  latestVersion: string
  downloadUrl: string
  forceUpdate: boolean
  loading: boolean
}

const defaultState: AppUpdateState = {
  updateAvailable: false,
  latestVersion: "",
  downloadUrl: APP_UPDATE_DOWNLOAD_URL,
  forceUpdate: false,
  loading: true,
}

export function useAppUpdate(): AppUpdateState {
  const [state, setState] = useState<AppUpdateState>(defaultState)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState((s) => ({ ...s, loading: false }))
      return
    }

    let cancelled = false
    const supabase = createClient()
    const current = APP_VERSION.full

    supabase
      .from("app_settings")
      .select("latest_version, min_required_version, download_url")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setState((s) => ({ ...s, loading: false }))
          return
        }
        const latestVersion = (data.latest_version as string)?.trim() ?? ""
        const minRequired = (data.min_required_version as string)?.trim() ?? ""
        const downloadUrl =
          (data.download_url as string)?.trim() || APP_UPDATE_DOWNLOAD_URL
        const forceUpdate =
          minRequired.length > 0 && compareVersions(current, minRequired) === -1
        const updateAvailable =
          latestVersion.length > 0 && compareVersions(current, latestVersion) === -1
        setState({
          updateAvailable,
          latestVersion,
          downloadUrl,
          forceUpdate,
          loading: false,
        })
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }))
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
