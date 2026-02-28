"use client"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { Settings, Star, ChevronDown } from "lucide-react"
import Link from "next/link"
import { ChildSelectorModal } from "@/components/child/child-selector-modal"
import { ChildAvatar } from "@/components/child/child-avatar"

export function Header() {
  const { selectedChild, isLoaded, state } = useFamily()
  const [showChildSelector, setShowChildSelector] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/icon.png" alt="FamiDo Task" className="h-9 w-9 rounded-xl object-contain" />
              <span className="font-[var(--font-fredoka)] text-xl font-semibold text-primary">FamiDo Task</span>
            </Link>

            {isLoaded && selectedChild && (
              <button
                onClick={() => setShowChildSelector(true)}
                className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <ChildAvatar avatar={selectedChild.avatar} color={selectedChild.color} size="sm" />
                <span className="font-semibold text-foreground">{selectedChild.name}</span>
                {state.children.length > 1 && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLoaded && selectedChild && (
              <div className="flex items-center gap-2 px-4 py-2 bg-points/20 rounded-full">
                <Star className="w-5 h-5 text-points fill-points" />
                <span className="font-bold text-foreground">{selectedChild.points}</span>
              </div>
            )}

            <Link
              href="/admin"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              aria-label="Einstellungen"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </header>

      <ChildSelectorModal open={showChildSelector} onClose={() => setShowChildSelector(false)} />
    </>
  )
}
