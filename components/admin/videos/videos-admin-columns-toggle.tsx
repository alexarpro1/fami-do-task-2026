"use client"

import { Button } from "@/components/ui/button"
import type { GalleryColumns } from "@/lib/videos/gallery-settings"
import { cn } from "@/lib/utils"

const COLUMN_OPTIONS: GalleryColumns[] = [2, 3, 4, 5, 6]

type ColumnLabels = {
  groupAria: string
  col2: string
  col3: string
  col4: string
  col5: string
  col6: string
}

function columnLabel(labels: ColumnLabels, cols: GalleryColumns): string {
  switch (cols) {
    case 2:
      return labels.col2
    case 3:
      return labels.col3
    case 4:
      return labels.col4
    case 5:
      return labels.col5
    case 6:
      return labels.col6
    default:
      return String(cols)
  }
}

export function VideosAdminColumnsToggle({
  value,
  onChange,
  labels,
  className,
}: {
  value: GalleryColumns
  onChange: (cols: GalleryColumns) => void
  labels: ColumnLabels
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-row flex-wrap items-center gap-0.5 rounded-xl border border-border/70 bg-card/60 p-0.5",
        className,
      )}
      role="group"
      aria-label={labels.groupAria}
    >
      {COLUMN_OPTIONS.map((cols) => {
        const active = value === cols
        const aria = columnLabel(labels, cols)
        return (
          <Button
            key={cols}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 min-w-9 rounded-lg px-2.5 text-sm font-semibold tabular-nums touch-manipulation select-none",
              active && "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
            )}
            onClick={() => onChange(cols)}
            aria-label={aria}
            aria-pressed={active}
            title={aria}
          >
            {cols}
          </Button>
        )
      })}
    </div>
  )
}
