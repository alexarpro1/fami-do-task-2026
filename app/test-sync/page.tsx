"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TestSyncPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Sync</h1>
      <p className="text-muted-foreground">
        Sync wird mit einer neuen Struktur und einem einzigen Sync-Manager neu aufgebaut.
      </p>
    </div>
  )
}
