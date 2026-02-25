"use client"

import { APP_VERSION, BUILD_INFO } from "@/lib/version"
import { Sparkles } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

/** Zeigt die aktuelle App-Version und Build-Datum in der Sidebar – sichtbar in der ganzen App. */
export function AppVersionFooter() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 px-2 py-2 text-center",
        isCollapsed ? "items-center" : "items-center",
      )}
    >
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
          {APP_VERSION.display}
        </span>
        <span className="text-muted-foreground/50 text-[10px]">•</span>
        <span className="text-[10px] text-muted-foreground">
          {BUILD_INFO.formatted}
        </span>
      </div>
      <div className="flex items-center justify-center gap-1 mt-0.5">
        <Sparkles className="w-3 h-3 text-amber-500" aria-hidden />
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
          Aktualisiert
        </span>
      </div>
    </div>
  )
}
