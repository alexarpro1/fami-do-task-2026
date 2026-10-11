"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CheckSquare, Gift, PawPrint, Smile, Sticker, Scale, User, MoreHorizontal, X, Gamepad2, Film } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFamily } from "@/context/family-context"
import { useTranslation } from "@/hooks/use-translation"
import { motion, AnimatePresence } from "framer-motion"

/** Aktiv, wenn pathname exakt href ist oder ein Unterpfad (z. B. /spiele/chess). */
function isPathActive(pathname: string, href: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/"
  if (href === "/") return normalized === "/"
  return normalized === href || normalized.startsWith(href + "/")
}

const navItemClass =
  "flex min-h-12 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 transition-colors touch-manipulation active:opacity-90 md:min-h-14 md:gap-1 md:rounded-2xl"

/**
 * Untere Navigation:
 * - Gesten-Navigation: kleiner System-Inset (Home-Indikator)
 * - 3-Button-Navigation: größerer System-Inset
 * - Tablet: hoehere Touch-Ziele
 * Nav-Padding und Mehr-Fenster nutzen denselben --fdt-bottom-chrome-pad.
 */
export function BottomNavigation() {
  const pathname = usePathname()
  const { selectedChild, state } = useFamily()
  const { t } = useTranslation()
  const [showMore, setShowMore] = useState(false)

  // Don't show on admin pages
  if (pathname.startsWith("/admin")) {
    return null
  }

  const shopEnabled = state.settings?.shopEnabled ?? true
  const profileEnabled = state.settings?.profileEnabled ?? true

  const allNavItems = [
    { href: "/", icon: Home, label: t.nav.home },
    { href: "/tasks", icon: CheckSquare, label: t.nav.tasks },
    { href: "/rules", icon: Scale, label: t.nav.rules },
    ...(shopEnabled ? [{ href: "/rewards", icon: Gift, label: t.nav.rewards }] : []),
    ...(profileEnabled ? [{ href: "/profile", icon: User, label: t.nav.profile }] : []),
    ...(state.settings.petSystemEnabled ? [{ href: "/pet", icon: PawPrint, label: t.nav.pet }] : []),
    ...(state.settings.stickerSystemEnabled ? [{ href: "/stickers", icon: Sticker, label: t.nav.stickers }] : []),
    ...(state.settings.moodTrackingEnabled ? [{ href: "/mood", icon: Smile, label: t.nav.mood }] : []),
    ...(state.settings.gamesEnabled !== false ? [{ href: "/spiele", icon: Gamepad2, label: t.nav.games }] : []),
    ...(state.settings.videosEnabled !== false ? [{ href: "/videos", icon: Film, label: t.nav.videos }] : []),
  ]

  const mainItems = allNavItems.slice(0, 4)
  const moreItems = allNavItems.slice(4)
  const hasMoreItems = moreItems.length > 0

  // Aktiver Tab aus "Mehr" (inkl. Unterpfade, z. B. /spiele/chess) → in die Leiste heben
  const activeMoreItem = hasMoreItems ? moreItems.find((item) => isPathActive(pathname, item.href)) ?? null : null

  // Wenn eine Seite aus "Mehr" aktiv ist: diese in der Leiste an Position 4 anzeigen, 4. Haupt-Eintrag tauscht rein
  const barItems =
    activeMoreItem && mainItems.length >= 4
      ? [mainItems[0], mainItems[1], mainItems[2], activeMoreItem]
      : mainItems
  const morePanelItems =
    activeMoreItem && mainItems.length >= 4
      ? [mainItems[3], ...moreItems.filter((item) => item.href !== activeMoreItem.href)]
      : moreItems

  const moreMenuItems = morePanelItems.length > 0 ? morePanelItems : moreItems
  // "Mehr" nur hervorheben, wenn das Sheet offen ist — nicht parallel zum aktiven Tab in der Leiste
  const highlightMore = showMore

  useEffect(() => {
    setShowMore(false)
  }, [pathname])

  return (
    <>
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55] bg-black/50"
              onClick={() => setShowMore(false)}
            />

            {/* Gleicher Bottom-Offset wie Nav (Gesten + 3-Button), Tablet zentriert/breiter */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className={cn(
                "fdt-more-sheet fdt-scroll fixed left-3 right-3 z-[60] max-h-[min(70dvh,70vh)] overflow-y-auto rounded-3xl border border-border/80 bg-card/95 p-4 pb-6 shadow-2xl backdrop-blur-md",
                "bottom-[calc(0.5rem+var(--fdt-bottom-nav-height)+var(--fdt-bottom-chrome-pad))]",
                "md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:p-5",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-foreground">{t.common?.more ?? "Mehr"}</span>
                <button
                  type="button"
                  onClick={() => setShowMore(false)}
                  className="touch-target-min rounded-full p-1 hover:bg-muted"
                  aria-label={t.common?.close ?? "Schließen"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5 md:gap-3">
                {moreMenuItems.map((item) => {
                  const isActive = isPathActive(pathname, item.href)
                  const Icon = item.icon
                  const isDisabled = !selectedChild && item.href !== "/" && item.href !== "/admin"

                  return (
                    <Link
                      key={item.href}
                      href={isDisabled ? "/" : item.href}
                      prefetch={false}
                      onClick={() => setTimeout(() => setShowMore(false), 5)}
                      className={cn(
                        "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-transparent p-3 transition-colors md:min-h-[4.5rem] md:p-4",
                        isActive
                          ? "border-primary/25 bg-primary/15"
                          : "bg-secondary/40 hover:bg-secondary/70",
                        isDisabled && "pointer-events-none opacity-40",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-6 w-6 md:h-7 md:w-7",
                          isActive ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "text-center text-xs font-medium md:text-sm",
                          isActive ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* pb = System-Inset: Gesten klein, 3-Button größer — gleiche Variable wie Mehr-Fenster */}
      <nav
        className="fdt-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-card/95 pb-[var(--fdt-bottom-chrome-pad)] backdrop-blur-md dark:border-border/50 dark:bg-card/92 select-none"
        style={{ touchAction: "manipulation" }}
      >
        <div
          className="safe-content-x box-border flex w-full max-w-full shrink-0 items-center justify-evenly gap-0.5 px-1.5 md:mx-auto md:max-w-3xl md:gap-1.5 md:px-3 [-webkit-tap-highlight-color:transparent]"
          style={{ height: "var(--fdt-bottom-nav-height)", minHeight: "var(--fdt-bottom-nav-height)" }}
        >
          {barItems.map((item) => {
            const isActive = isPathActive(pathname, item.href)
            const Icon = item.icon
            const isDisabled = !selectedChild && item.href !== "/" && item.href !== "/admin"

            return (
              <Link
                key={item.href}
                href={isDisabled ? "/" : item.href}
                prefetch={false}
                className={cn(
                  navItemClass,
                  isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary/50",
                  isDisabled && "pointer-events-none opacity-40",
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors md:h-6 md:w-6",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span
                  className={cn(
                    "max-w-full truncate text-center text-[11px] leading-tight transition-colors md:text-xs",
                    isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}

          {hasMoreItems && (
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className={cn(
                navItemClass,
                highlightMore ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary/50",
              )}
              aria-label={t.common?.more ?? "Mehr"}
              aria-expanded={showMore}
              aria-haspopup="dialog"
            >
              <MoreHorizontal
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors md:h-6 md:w-6",
                  highlightMore ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={highlightMore ? 2.4 : 2}
              />
              <span
                className={cn(
                  "max-w-full truncate text-center text-[11px] leading-tight transition-colors md:text-xs",
                  highlightMore ? "font-semibold text-primary" : "font-medium text-muted-foreground",
                )}
              >
                {t.common?.more ?? "Mehr"}
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
