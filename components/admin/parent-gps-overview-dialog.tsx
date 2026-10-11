"use client"

import { useMemo, useState } from "react"
import { MapPin } from "lucide-react"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { computeParentLocationOverviewStats } from "@/lib/location/parent-overview-stats"

export function ParentGpsOverviewDialogTrigger({
  fullWidth,
  className,
}: {
  fullWidth?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const { state } = useFamily()
  const stats = useMemo(
    () => computeParentLocationOverviewStats(state.children),
    [state.children],
  )

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("gap-2 min-h-[48px]", fullWidth && "w-full", className)}
        onClick={() => setOpen(true)}
      >
        <MapPin className="h-4 w-4" />
        Standort-Uebersicht
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Standort &amp; ACK</DialogTitle>
            <DialogDescription>
              Kinder mit letztem Standort und offenen Empfangsbestaetigungen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Kinder" value={stats.totalChildren} />
            <Stat label="Mit Ort" value={stats.childrenWithAnyLocation} />
            <Stat label="ACK heute" value={stats.ackToday} />
            <Stat label="Offen" value={stats.pendingAckNow} />
          </div>
          <ul className="space-y-2 text-sm">
            {(state.children ?? []).map((child) => {
              const loc = child.lastSharedLocation
              const pending = loc?.sendId && !loc.ackedAt
              return (
                <li
                  key={child.id}
                  className="rounded-lg border border-border p-3 flex justify-between gap-2"
                >
                  <span className="font-medium">{child.name}</span>
                  <span className="text-muted-foreground text-xs text-right">
                    {loc?.lat != null
                      ? `${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`
                      : "Kein Standort"}
                    {pending ? " · ACK offen" : loc?.ackedAt ? " · ACK ok" : ""}
                  </span>
                </li>
              )
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}
