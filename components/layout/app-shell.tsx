"use client"

import type React from "react"
import { useFamily } from "@/context/family-context"
import { Header } from "@/components/ui/header"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useSchoolTimeLock, SchoolTimeLockScreen } from "@/components/school/school-time-lock"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTaskNotifications } from "@/hooks/use-task-notifications"
import { DashboardLayout } from "./dashboard-layout"

interface AppShellProps {
  children: React.ReactNode
  hideHeader?: boolean
  hideNav?: boolean
}

export function AppShell({ children, hideHeader = false, hideNav = false }: AppShellProps) {
  const { isLoaded } = useFamily()
  const { isLocked } = useSchoolTimeLock()

  useTaskNotifications()

  if (!isLoaded) {
    return <LoadingScreen />
  }

  if (isLocked) {
    return <SchoolTimeLockScreen />
  }

  // Always use mobile layout (no sidebar) - works on all devices
  return (
    <div className="min-h-screen min-w-[300px] bg-background flex flex-col">
      {!hideHeader && <Header />}
      <main className="flex-1 pb-20">{children}</main>
      {!hideNav && <BottomNavigation />}
    </div>
  )
}
