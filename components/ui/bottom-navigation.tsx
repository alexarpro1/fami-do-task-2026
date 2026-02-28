"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CheckSquare, Gift, PawPrint, Smile, Sticker, Scale, User, MoreHorizontal, X, Gamepad2 } from "lucide-react"
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
    { href: "/rules", icon: Scale, label: "Regeln" },
    ...(shopEnabled ? [{ href: "/rewards", icon: Gift, label: t.nav.rewards }] : []),
    ...(profileEnabled ? [{ href: "/profile", icon: User, label: t.nav.profile }] : []),
    ...(state.settings.petSystemEnabled ? [{ href: "/pet", icon: PawPrint, label: t.nav.pet }] : []),
    ...(state.settings.stickerSystemEnabled ? [{ href: "/stickers", icon: Sticker, label: t.nav.stickers }] : []),
    ...(state.settings.moodTrackingEnabled ? [{ href: "/mood", icon: Smile, label: t.nav.mood }] : []),
    ...(state.settings.gamesEnabled !== false ? [{ href: "/spiele", icon: Gamepad2, label: t.nav.games }] : []),
  ]

  const mainItems = allNavItems.slice(0, 4)
  const moreItems = allNavItems.slice(4)
  const hasMoreItems = moreItems.length > 0

  // Aktiver Tab in "Mehr" (inkl. Unterpfade, z. B. /spiele/chess)
  const isMoreActive = moreItems.some((item) => isPathActive(pathname, item.href))
  const activeMoreItem = hasMoreItems ? moreItems.find((item) => isPathActive(pathname, item.href)) ?? null : null

  // Wenn eine Seite aus "Mehr" aktiv ist: diese in der Leiste an Position 4 anzeigen, 4. Haupt-Eintrag (z. B. Profil) tauscht rein
  const barItems =
    activeMoreItem && mainItems.length >= 4
      ? [mainItems[0], mainItems[1], mainItems[2], activeMoreItem]
      : mainItems
  const morePanelItems =
    activeMoreItem && mainItems.length >= 4
      ? [mainItems[3], ...moreItems.filter((item) => item.href !== activeMoreItem.href)]
      : moreItems

  // Auf Seiten aus "Mehr" (z. B. Spiele) das Panel kurz anzeigen; beim Verlassen der Seite wieder schließen
  useEffect(() => {
    if (!hasMoreItems) return
    if (isMoreActive) {
      setShowMore(true)
      const t = setTimeout(() => setShowMore(false), 5)
      return () => clearTimeout(t)
    }
    setShowMore(false)
  }, [pathname, isMoreActive, hasMoreItems])

  return (
    <>
      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMore(false)}
            />

            {/* More Menu */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-20 left-4 right-4 z-50 bg-card rounded-2xl border border-border shadow-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground">Mehr</span>
                <button onClick={() => setShowMore(false)} className="p-1 rounded-full hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {morePanelItems.map((item) => {
                  const isActive = isPathActive(pathname, item.href)
                  const Icon = item.icon
                  const isDisabled = !selectedChild && item.href !== "/" && item.href !== "/admin"

                  return (
                    <Link
                      key={item.href}
                      href={isDisabled ? "/" : item.href}
                      onClick={() => setTimeout(() => setShowMore(false), 5)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 p-3 rounded-xl transition-all",
                        isActive && "bg-primary/10",
                        isDisabled && "opacity-40 pointer-events-none",
                      )}
                    >
                      <Icon className={cn("w-6 h-6", isActive ? "text-primary" : "text-muted-foreground")} />
                      <span
                        className={cn(
                          "text-xs font-medium text-center",
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

      {/* Main Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-pb">
        <div className="flex items-center justify-around h-16 w-full px-2 sm:px-4">
          {barItems.map((item) => {
            const isActive = isPathActive(pathname, item.href)
            const Icon = item.icon
            const isDisabled = !selectedChild && item.href !== "/" && item.href !== "/admin"

            return (
              <Link
                key={item.href}
                href={isDisabled ? "/" : item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all",
                  isActive && "bg-primary/10",
                  isDisabled && "opacity-40 pointer-events-none",
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn("w-6 h-6 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}
                />
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* More Button - only show if there are more items */}
          {hasMoreItems && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all",
                (showMore || isMoreActive) && "bg-primary/10",
              )}
              aria-label="Mehr"
            >
              <MoreHorizontal
                className={cn(
                  "w-6 h-6 transition-colors",
                  showMore || isMoreActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  showMore || isMoreActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                Mehr
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
