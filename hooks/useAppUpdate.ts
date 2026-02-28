"use client"

import { useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { APP_UPDATE_DOWNLOAD_URL } from "@/lib/version"
import { isRemoteVersionNewer } from "@/lib/sync-v2/version-client"

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

    supabase
      .from("app_updates")
      .select("latest_version, force_update, download_url")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setState((s) => ({ ...s, loading: false }))
          return
        }
        const latestVersion = (data.latest_version as string)?.trim() ?? ""
        const forceUpdate = Boolean(data.force_update)
        const downloadUrl =
          (data.download_url as string)?.trim() || APP_UPDATE_DOWNLOAD_URL
        const updateAvailable =
          latestVersion.length > 0 && isRemoteVersionNewer(latestVersion)
        setState({
          updateAvailable,
          latestVersion,
          downloadUrl,
          forceUpdate: updateAvailable ? forceUpdate : false,
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
