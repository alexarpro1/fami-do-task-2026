"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Login-Formular für den Familien-Cloud-Account (Supabase Auth).
 * Ein Account pro Familie (E-Mail/Passwort). Wird im CloudSyncPanel angezeigt,
 * wenn keine Session existiert.
 */
export function FamilyCloudLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleSignIn() {
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message === "Invalid login credentials" ? "Falsches Passwort oder unbekannte E-Mail." : err.message)
      return
    }
  }

  async function handleSignUp() {
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setError(null)
    // Optional: Hinweis "Bitte E-Mail bestätigen" anzeigen, wenn Supabase E-Mail-Bestätigung nutzt
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Melde dich mit dem Familien-Account an, um Cloud-Sync zu nutzen (ein Account pro Familie).
      </p>
      <div className="space-y-2">
        <Label htmlFor="family-email">E-Mail</Label>
        <Input
          id="family-email"
          type="email"
          placeholder="familie@beispiel.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="family-password">Passwort</Label>
        <Input
          id="family-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
          className="rounded-xl"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleSignIn}
          disabled={loading || !email || !password}
          className="rounded-xl"
        >
          {loading ? "Bitte warten…" : "Einloggen"}
        </Button>
        <Button
          variant="outline"
          onClick={handleSignUp}
          disabled={loading || !email || !password}
          className="rounded-xl"
        >
          Familien-Account erstellen
        </Button>
      </div>
    </div>
  )
}
