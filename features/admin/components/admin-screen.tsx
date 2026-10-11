"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { AppShell } from "@shell/components/app-shell"
import { useFamily } from "@/context/family-context"
import { useDeviceRole } from "@/hooks/useDeviceRole"
import { PinLogin } from "@/components/admin/pin-login"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminTabs } from "@/components/admin/admin-tabs"
import { ChildManager } from "@/components/admin/child-manager"
import { TaskManager } from "@/components/admin/task-manager"
import { RuleManager } from "@/components/admin/rule-manager"
import { RewardManager } from "@/components/admin/reward-manager"
import { StatisticsPanel } from "@/components/admin/statistics-panel"
import { SettingsPanel } from "@/components/admin/settings-panel"
import {
  ADMIN_TAB_STORAGE_KEY,
  KontrollzentralePanel,
} from "@/components/admin/kontrollzentrale-panel"
import { VideosAdminPanel } from "@/components/admin/videos-admin-panel"
import type { AdminTab } from "@/types"

const DEFAULT_ORDER: AdminTab[] = [
  "children",
  "kontrollzentrale",
  "tasks",
  "rules",
  "rewards",
  "videos",
  "stats",
  "settings",
]

const ALL_TABS = new Set<AdminTab>(DEFAULT_ORDER)

function mergeTabOrder(saved: AdminTab[] | undefined): AdminTab[] {
  if (!saved?.length) return DEFAULT_ORDER
  const ordered = saved.filter((id) => ALL_TABS.has(id))
  const missing = DEFAULT_ORDER.filter((id) => !ordered.includes(id))
  return [...ordered, ...missing]
}

function peekPreferredAdminTab(): AdminTab | null {
  if (typeof window === "undefined") return null
  try {
    const fromSession = sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY)
    if (fromSession && ALL_TABS.has(fromSession as AdminTab)) {
      return fromSession as AdminTab
    }
  } catch {
    /* ignore */
  }
  return null
}

function clearPreferredAdminTab() {
  try {
    sessionStorage.removeItem(ADMIN_TAB_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Alte Freischaltung aus der vorherigen Sitzungslogik. Wird beim Verlassen geleert. */
const ADMIN_UNLOCK_SESSION_KEY = "famiapp-admin-unlock"
let adminUnlockMemory = false

function clearAdminUnlock() {
  adminUnlockMemory = false
  try {
    sessionStorage.removeItem(ADMIN_UNLOCK_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function navigateAwayFromAdmin() {
  if (typeof window === "undefined") return
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  window.location.assign("/")
}

export function AdminScreen() {
  const { state } = useFamily()
  const [deviceRole, , roleHydrated] = useDeviceRole()
  const isParentDevice = roleHydrated && (deviceRole === "parent" || deviceRole === "master")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>("settings")
  const initialTabSetRef = useRef(false)
  const leavingRef = useRef(false)

  const adminPinEnabled = state.settings?.adminPinEnabled ?? true
  const tabOrder = useMemo(() => {
    const merged = mergeTabOrder(state.settings?.adminTabOrder)
    // Kontrollzentrale nur auf Eltern-/Master-Geräten
    if (!isParentDevice) return merged.filter((id) => id !== "kontrollzentrale")
    return merged
  }, [state.settings?.adminTabOrder, isParentDevice])
  const showPin = adminPinEnabled && !leavingRef.current && !isAuthenticated

  const leaveAdminPanel = () => {
    leavingRef.current = true
    clearAdminUnlock()
    setIsAuthenticated(false)
    navigateAwayFromAdmin()
  }

  // Tab-Vorauswahl erst nach PIN (sonst löscht Strict-Mode-Remount den sessionStorage-Key zu früh)
  useEffect(() => {
    if (showPin || initialTabSetRef.current || !roleHydrated) return
    const preferred = peekPreferredAdminTab()
    if (preferred === "kontrollzentrale" && !isParentDevice) {
      clearPreferredAdminTab()
      if (tabOrder.length > 0) {
        setActiveTab(tabOrder[0])
        initialTabSetRef.current = true
      }
      return
    }
    if (preferred && (preferred !== "kontrollzentrale" || isParentDevice)) {
      setActiveTab(preferred)
      clearPreferredAdminTab()
      initialTabSetRef.current = true
      return
    }
    if (tabOrder.length > 0) {
      setActiveTab(tabOrder[0])
      initialTabSetRef.current = true
    }
  }, [tabOrder, showPin, roleHydrated, isParentDevice])

  // Kind-Gerät: aktiven Kontrollzentrale-Tab verlassen
  useEffect(() => {
    if (!roleHydrated || isParentDevice) return
    if (activeTab === "kontrollzentrale") {
      setActiveTab(tabOrder[0] ?? "settings")
    }
  }, [roleHydrated, isParentDevice, activeTab, tabOrder])

  useEffect(() => {
    const onSetTab = (ev: Event) => {
      const detail = (ev as CustomEvent<{ tab?: string }>).detail
      const tab = detail?.tab
      if (tab === "kontrollzentrale" && !isParentDevice) return
      if (tab && ALL_TABS.has(tab as AdminTab)) {
        setActiveTab(tab as AdminTab)
      }
    }
    window.addEventListener("famiapp:admin-set-tab", onSetTab as EventListener)
    return () => window.removeEventListener("famiapp:admin-set-tab", onSetTab as EventListener)
  }, [isParentDevice])

  return (
    <AppShell hideNav hideHeader={showPin || leavingRef.current}>
      {leavingRef.current ? null : showPin ? (
        <PinLogin
          correctPin={state.settings?.adminPin ?? "1234"}
          onSuccess={() => setIsAuthenticated(true)}
          onCancel={leaveAdminPanel}
        />
      ) : (
        <div className="px-4 py-6 pb-24">
          <AdminHeader onLogout={leaveAdminPanel} />
          <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} tabOrder={tabOrder} />

          <div className="mt-6">
            {activeTab === "children" && <ChildManager />}
            {activeTab === "kontrollzentrale" && isParentDevice && <KontrollzentralePanel />}
            {activeTab === "tasks" && <TaskManager />}
            {activeTab === "rules" && <RuleManager />}
            {activeTab === "rewards" && <RewardManager />}
            {activeTab === "videos" && <VideosAdminPanel />}
            {activeTab === "stats" && <StatisticsPanel />}
            {activeTab === "settings" && <SettingsPanel />}
          </div>
        </div>
      )}
    </AppShell>
  )
}
