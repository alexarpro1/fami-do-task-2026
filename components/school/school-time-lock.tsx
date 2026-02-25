"use client"

import { useFamily } from "@/context/family-context"
import { useTranslation } from "@/hooks/use-translation"
import { Clock, BookOpen, GraduationCap } from "lucide-react"

export function useSchoolTimeLock() {
  const { selectedChild, state } = useFamily()

  if (!selectedChild || !state.settings.schoolTimeEnabled) {
    return { isLocked: false, schoolTime: null }
  }

  const schoolTime = state.schoolTimes.find((st) => st.childId === selectedChild.id)

  if (!schoolTime || !schoolTime.enabled) {
    return { isLocked: false, schoolTime }
  }

  const now = new Date()
  const currentDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()]

  // Check if today is a school day
  if (!schoolTime.days.includes(currentDay)) {
    return { isLocked: false, schoolTime }
  }

  // Parse times
  const [startHour, startMin] = schoolTime.startTime.split(":").map(Number)
  const [endHour, endMin] = schoolTime.endTime.split(":").map(Number)

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  const isLocked = currentMinutes >= startMinutes && currentMinutes < endMinutes

  return { isLocked, schoolTime }
}

export function SchoolTimeLockScreen() {
  const { t } = useTranslation()
  const { schoolTime } = useSchoolTimeLock()

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
      <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-pulse">
        <GraduationCap className="w-12 h-12 text-primary" />
      </div>

      <h1 className="font-[var(--font-fredoka)] text-3xl font-bold text-foreground mb-2 text-center">
        {t.school.schoolTime}
      </h1>

      <p className="text-muted-foreground text-center mb-8 max-w-xs">{t.school.locked}</p>

      <div className="bg-card rounded-2xl p-6 neu-flat w-full max-w-xs">
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center">
            <Clock className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">{t.school.startsAt}</span>
            <span className="font-bold text-lg">{schoolTime?.startTime || "08:00"}</span>
          </div>

          <div className="text-2xl text-muted-foreground">→</div>

          <div className="flex flex-col items-center">
            <BookOpen className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">{t.school.endsAt}</span>
            <span className="font-bold text-lg">{schoolTime?.endTime || "13:00"}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-8 text-center">Konzentriere dich auf die Schule!</p>
    </div>
  )
}
