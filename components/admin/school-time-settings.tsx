"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { DAYS } from "@/lib/constants"
import { Clock, GraduationCap } from "lucide-react"
import type { SchoolTime } from "@/types"

export function SchoolTimeSettings() {
  const { state, dispatch } = useFamily()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h3 className="font-[var(--font-fredoka)] font-bold text-foreground">Schulzeit-Einstellungen</h3>
      </div>

      {/* Global Toggle */}
      <div className="flex items-center justify-between p-4 bg-card rounded-xl neu-flat">
        <div>
          <Label className="font-medium text-card-foreground">Schulzeit-Sperre aktivieren</Label>
          <p className="text-xs text-muted-foreground">App waehrend der Schulzeit sperren</p>
        </div>
        <Switch
          checked={state.settings.schoolTimeEnabled}
          onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", payload: { schoolTimeEnabled: checked } })}
        />
      </div>

      {state.settings.schoolTimeEnabled && (
        <>
          <p className="text-sm text-muted-foreground">Konfiguriere die Schulzeiten fuer jedes Kind:</p>

          {!state.children || state.children.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Noch keine Kinder vorhanden.</p>
          ) : (
            (state.children || []).map((child) => (
              <ChildSchoolTimeCard
                key={child.id}
                childId={child.id}
                childName={child.name}
                childAvatar={child.avatar}
              />
            ))
          )}
        </>
      )}
    </div>
  )
}

function ChildSchoolTimeCard({
  childId,
  childName,
  childAvatar,
}: {
  childId: string
  childName: string
  childAvatar: string
}) {
  const { state, dispatch } = useFamily()

  const existingSchoolTime = state.schoolTimes.find((st) => st.childId === childId)

  const [enabled, setEnabled] = useState(existingSchoolTime?.enabled || false)
  const [startTime, setStartTime] = useState(existingSchoolTime?.startTime || "08:00")
  const [endTime, setEndTime] = useState(existingSchoolTime?.endTime || "13:00")
  const [days, setDays] = useState<string[]>(existingSchoolTime?.days || ["mon", "tue", "wed", "thu", "fri"])

  const handleSave = () => {
    const schoolTime: SchoolTime = {
      childId,
      enabled,
      days,
      startTime,
      endTime,
    }
    dispatch({ type: "SET_SCHOOL_TIME", payload: schoolTime })
  }

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  return (
    <div className="bg-card rounded-xl p-4 neu-flat">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{childAvatar}</span>
          <span className="font-medium text-card-foreground">{childName}</span>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <>
          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Beginn</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Ende</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Day Selection */}
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-2 block">Schultage</Label>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={cn(
                    "w-9 h-9 rounded-full text-xs font-medium transition-all",
                    days.includes(day.key)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full rounded-xl">
            Speichern
          </Button>
        </>
      )}
    </div>
  )
}
