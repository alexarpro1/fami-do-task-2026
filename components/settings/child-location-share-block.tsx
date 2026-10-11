"use client"

import { useFamily } from "@/context/family-context"
import { useDeviceRole } from "@/hooks/useDeviceRole"
import { Switch } from "@/components/ui/switch"
import { CHILD_LOCATION_AUTO_SHARE_INTERVAL_OPTIONS } from "@/lib/child-location-share"

export function ChildLocationShareBlock() {
  const { state, dispatch } = useFamily()
  const [role, , hydrated] = useDeviceRole()
  if (!hydrated || (role !== "parent" && role !== "master")) return null

  const settings = state.settings
  const autoOn = settings.childLocationAutoShareEnabled !== false
  const interval = settings.childLocationAutoShareIntervalMinutes ?? 30

  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      <p className="text-sm font-semibold">Kind-Standort (Steuerung)</p>
      <label className="flex items-center justify-between gap-3 min-h-[48px]">
        <span className="text-sm">Automatisch teilen (Kind-Geraet)</span>
        <Switch
          checked={autoOn}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_SETTINGS",
              payload: { childLocationAutoShareEnabled: checked },
            })
          }
        />
      </label>
      <label className="block text-xs text-muted-foreground">
        Intervall (Minuten)
        <select
          className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
          value={interval}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_SETTINGS",
              payload: {
                childLocationAutoShareIntervalMinutes: Number(e.target.value),
              },
            })
          }
        >
          {CHILD_LOCATION_AUTO_SHARE_INTERVAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
