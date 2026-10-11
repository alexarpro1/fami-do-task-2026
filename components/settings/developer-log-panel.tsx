"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  clearDevLog,
  formatDevLogForExport,
  getDevLogEntries,
  isDevLogEnabled,
  setDevLogEnabled,
  subscribeDevLog,
} from "@/lib/dev-log"

export function DeveloperLogPanel() {
  const [enabled, setEnabled] = useState(false)
  const [entries, setEntries] = useState(getDevLogEntries())

  useEffect(() => {
    setEnabled(isDevLogEnabled())
    return subscribeDevLog(() => setEntries(getDevLogEntries()))
  }, [])

  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      <div className="flex items-center justify-between gap-3 min-h-[48px]">
        <p className="text-sm font-semibold">Entwickler-Protokoll</p>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            setDevLogEnabled(checked)
            setEnabled(checked)
          }}
        />
      </div>
      <pre className="max-h-40 overflow-auto rounded-lg bg-muted/30 p-2 text-[10px] leading-snug whitespace-pre-wrap">
        {enabled ? formatDevLogForExport(entries).slice(-8000) : "Protokoll ist aus."}
      </pre>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => clearDevLog()}>
          Leeren
        </Button>
      </div>
    </div>
  )
}
