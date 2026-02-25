"use client"

import { useState, useEffect, useRef } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { PinLogin } from "@/components/admin/pin-login"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminTabs } from "@/components/admin/admin-tabs"
import { ChildManager } from "@/components/admin/child-manager"
import { TaskManager } from "@/components/admin/task-manager"
import { RuleManager } from "@/components/admin/rule-manager"
import { RewardManager } from "@/components/admin/reward-manager"
import { StatisticsPanel } from "@/components/admin/statistics-panel"
import { SettingsPanel } from "@/components/admin/settings-panel"
import type { AdminTab } from "@/types"

const DEFAULT_ORDER: AdminTab[] = ["children", "tasks", "rules", "rewards", "stats", "settings"]

export default function AdminPage() {
  const { state } = useFamily()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>("settings")
  const initialTabSetRef = useRef(false)

  const adminPinEnabled = state.settings?.adminPinEnabled ?? true
  const tabOrder = state.settings?.adminTabOrder ?? DEFAULT_ORDER

  useEffect(() => {
    return () => {
      if (adminPinEnabled) {
        setIsAuthenticated(false)
      }
    }
  }, [adminPinEnabled])

  useEffect(() => {
    if (!initialTabSetRef.current && tabOrder && tabOrder.length > 0) {
      setActiveTab(tabOrder[0])
      initialTabSetRef.current = true
    }
  }, [tabOrder])

  // Immer dieselbe Baumstruktur (AppShell) für Server/Client, um Hydration-Mismatch zu vermeiden.
  // Wenn PIN nötig: PinLogin als Inhalt; sonst Admin-Inhalt. AppShell zeigt bei !isLoaded selbst LoadingScreen.
  const showPin = adminPinEnabled && !isAuthenticated

  return (
    <AppShell hideNav hideHeader={showPin}>
      {showPin ? (
        <PinLogin
          correctPin={state.settings?.adminPin ?? "1234"}
          onSuccess={() => setIsAuthenticated(true)}
          onCancel={() => window.history.back()}
        />
      ) : (
        <div className="px-4 py-6 pb-24">
          <AdminHeader
            onLogout={() => {
              if (adminPinEnabled) {
                setIsAuthenticated(false)
              } else {
                window.history.back()
              }
            }}
          />
          <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} tabOrder={tabOrder} />

          <div className="mt-6">
            {activeTab === "children" && <ChildManager />}
            {activeTab === "tasks" && <TaskManager />}
            {activeTab === "rules" && <RuleManager />}
            {activeTab === "rewards" && <RewardManager />}
            {activeTab === "stats" && <StatisticsPanel />}
            {activeTab === "settings" && <SettingsPanel />}
          </div>
        </div>
      )}
    </AppShell>
  )
}
