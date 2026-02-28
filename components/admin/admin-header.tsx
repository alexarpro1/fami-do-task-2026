"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface AdminHeaderProps {
  onLogout?: () => void
}

export function AdminHeader({ onLogout }: AdminHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-card neu-flat flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        ) : (
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-card neu-flat flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin-Panel</h1>
          <p className="text-sm text-muted-foreground">Verwaltung & Einstellungen</p>
        </div>
      </div>
    </div>
  )
}
