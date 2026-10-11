"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { Settings, Star, ChevronDown } from "lucide-react"
import Link from "next/link"
import { ChildSelectorModal } from "@/components/child/child-selector-modal"
import { ChildAvatar } from "@/components/child/child-avatar"
import { GoldCoinIcon } from "@/components/ui/gold-coin-icon"

export function Header() {
  const { selectedChild, isLoaded, state } = useFamily()
  const [showChildSelector, setShowChildSelector] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-40 w-full min-w-0 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto flex min-h-14 w-full min-w-0 max-w-full items-center justify-between gap-1 px-2 sm:min-h-[3.5rem] sm:gap-2 sm:px-3 md:min-h-16 md:gap-3 md:px-4 lg:max-w-7xl lg:gap-4 lg:px-5 xl:px-6">
          {/* Links: Logo + Titel (ab sm) + Kind-Button – nimmt Restplatz, schrumpft ohne Überlappung */}
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden sm:gap-2 md:gap-3 lg:gap-4">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 narrow:gap-2 lg:gap-2.5"
              aria-label="FamiDo Task Startseite"
            >
              <img
                src="/icon.png"
                alt=""
                className="h-7 w-7 shrink-0 rounded-md object-contain narrow:h-9 narrow:w-9 narrow:rounded-xl lg:h-10 lg:w-10"
              />
              <span className="font-[var(--font-fredoka)] hidden whitespace-nowrap font-semibold text-primary narrow:inline narrow:text-lg md:text-xl">
                FamiDo Task
              </span>
            </Link>

            {isLoaded && selectedChild && (
              <button
                type="button"
                onClick={() => setShowChildSelector(true)}
                className="flex min-w-0 shrink items-center gap-1 overflow-hidden rounded-lg px-1.5 py-1 transition-colors hover:bg-secondary/50 sm:gap-2 sm:rounded-xl sm:px-2 sm:py-1.5 md:px-2.5 lg:px-3"
              >
                <ChildAvatar
                  avatar={selectedChild.avatar}
                  color={selectedChild.color}
                  size="sm"
                />
                <span className="min-w-0 truncate text-sm font-semibold text-foreground max-w-[3rem] sm:max-w-[5.5rem] md:max-w-[7rem] lg:max-w-[9rem] xl:max-w-[11rem]">
                  {selectedChild.name}
                </span>
                {state.children.length > 1 && (
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          {/* Rechts: Punkte, Gold, Einstellungen – kompakte feste Breite, skaliert mit Viewport */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
            {isLoaded && selectedChild && (
              <>
                <div
                  className="flex items-center gap-0.5 rounded-full border border-points/30 bg-points/25 px-1.5 py-1 sm:gap-2 sm:px-2.5 sm:py-2 lg:px-3 lg:py-2"
                  title="Punkte"
                >
                  <Star className="h-3.5 w-3.5 shrink-0 text-points fill-points sm:h-5 sm:w-5" />
                  <span className="min-w-[1.25rem] text-center text-xs font-bold tabular-nums text-foreground sm:min-w-[1.5rem] sm:text-base">
                    {selectedChild.points}
                  </span>
                </div>
                <div
                  className="flex items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/25 px-1.5 py-1 sm:gap-2 sm:px-2.5 sm:py-2 lg:px-3 lg:py-2"
                  title="Goldmünzen"
                >
                  <GoldCoinIcon
                    size={18}
                    className="h-[14px] w-[14px] shrink-0 drop-shadow-sm sm:h-[22px] sm:w-[22px]"
                  />
                  <span className="min-w-[1.25rem] text-center text-xs font-bold tabular-nums text-foreground sm:min-w-[1.5rem] sm:text-base">
                    {selectedChild.gameGoldCoins ?? 0}
                  </span>
                </div>
              </>
            )}

            <Link
              href="/admin"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80 sm:h-10 sm:w-10"
              aria-label="Einstellungen"
            >
              <Settings className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
            </Link>
          </div>
        </div>
      </header>

      <ChildSelectorModal open={showChildSelector} onClose={() => setShowChildSelector(false)} />
    </>
  )
}
