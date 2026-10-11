import { cn } from "@/lib/utils"

/** Gemeinsame Form-Feld-Styles für Admin-Videos (FamiApp Tokens). */
export const videosAdminFieldClass = cn(
  "w-full min-h-11 rounded-2xl border-2 border-primary/25 bg-card px-4 py-2.5",
  "text-sm font-medium text-foreground shadow-sm transition-[color,box-shadow,border-color]",
  "placeholder:text-muted-foreground",
  "hover:border-primary/40",
  "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
  "disabled:cursor-not-allowed disabled:opacity-50",
)

export const videosAdminSelectClass = cn(
  videosAdminFieldClass,
  "appearance-none cursor-pointer pr-10",
  // Keine bg-* Utilities hier – sonst entfernt tailwind-merge bg-card
  "[background-size:1rem] [background-position:right_0.85rem_center] [background-repeat:no-repeat]",
)

/** Chevron als CSS-Hintergrund; Farbe bleibt über bg-card / --card. */
export const videosAdminSelectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundColor: "var(--card)",
} as const

export const videosAdminLabelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"

export const videosAdminPanelClass =
  "space-y-3 rounded-[1.35rem] border border-primary/20 bg-card p-4 shadow-sm"

export const videosAdminHintClass =
  "text-xs text-muted-foreground rounded-2xl border border-primary/15 bg-primary/5 px-3.5 py-2.5"

/** Zeile mit Switch: Primary-Fläche, klarer Kontrast. */
export const videosAdminSwitchRowClass =
  "flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3"

export const videosAdminSwitchClass = cn(
  "shrink-0 shadow-sm",
  "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/40",
  "dark:data-[state=unchecked]:bg-muted-foreground/50",
)

export const videosAdminButtonSecondaryClass =
  "rounded-full border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"

export const videosAdminButtonDangerClass =
  "rounded-full border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"

export const videosAdminCardClass =
  "rounded-[1.35rem] border border-primary/20 bg-card shadow-sm min-w-0"
