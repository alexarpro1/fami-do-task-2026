"use client"

import { useMemo } from "react"
import { useFamily } from "@/context/family-context"
import { useTranslation } from "@/hooks/use-translation"
import { useDeviceRole } from "@/hooks/useDeviceRole"
import { computeParentLocationOverviewStats } from "@/lib/location/parent-overview-stats"
import { acknowledgeAllPendingLocations } from "@/lib/location/acknowledge-pending-locations"
import { getDeviceId } from "@/lib/device"
import { Button } from "@/components/ui/button"
import { ParentGpsOverviewDialogTrigger } from "@/components/admin/parent-gps-overview-dialog"

export const ADMIN_TAB_STORAGE_KEY = "famiapp-admin-preferred-tab"

export function KontrollzentralePanel() {
  const { state, dispatch } = useFamily()
  const { translate } = useTranslation()
  const [role] = useDeviceRole()
  const stats = useMemo(
    () => computeParentLocationOverviewStats(state.children),
    [state.children],
  )

  if (role !== "parent" && role !== "master") {
    return (
      <p className="text-sm text-muted-foreground px-2">
        {translate("kontrollzentrale.childDeviceHint")}
      </p>
    )
  }

  return (
    <div className="space-y-4 p-2">
      <div>
        <h2 className="text-lg font-semibold">{translate("kontrollzentrale.title")}</h2>
        <p className="text-xs text-muted-foreground">{translate("kontrollzentrale.subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label={translate("kontrollzentrale.kpiChildren")} value={stats.totalChildren} />
        <Kpi label={translate("kontrollzentrale.kpiWithLocation")} value={stats.childrenWithAnyLocation} />
        <Kpi label={translate("kontrollzentrale.kpiAckToday")} value={stats.ackToday} />
        <Kpi label={translate("kontrollzentrale.kpiPendingAck")} value={stats.pendingAckNow} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <ParentGpsOverviewDialogTrigger fullWidth className="rounded-xl" />
        <Button
          type="button"
          variant="outline"
          className="min-h-[48px] flex-1"
          disabled={stats.pendingAckNow === 0}
          onClick={() => {
            acknowledgeAllPendingLocations(state.children, dispatch, {
              role: role === "master" ? "master" : "parent",
              deviceId: getDeviceId(),
            })
          }}
        >
          {translate("kontrollzentrale.approvals")} ({stats.pendingAckNow})
        </Button>
      </div>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
