"use client"

import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { StickerAlbum } from "@/components/sticker/sticker-album"
import Link from "next/link"

export default function StickersPage() {
  const { selectedChild, state } = useFamily()

  if (!state.settings.stickerSystemEnabled) {
    return (
      <AppShell>
        <EmptyState
          icon="🎨"
          title="Sticker-System deaktiviert"
          description="Das Sticker-System ist in den Einstellungen deaktiviert."
        />
      </AppShell>
    )
  }

  if (!selectedChild) {
    return (
      <AppShell>
        <EmptyState
          icon="👤"
          title="Kein Kind ausgewählt"
          description="Wähle zuerst ein Kind aus."
          action={
            <Link href="/">
              <Button>Zur Startseite</Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="px-4 py-6">
        <StickerAlbum />
      </div>
    </AppShell>
  )
}
