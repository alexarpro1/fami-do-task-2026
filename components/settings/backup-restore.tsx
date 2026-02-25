"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { Download, Upload, AlertTriangle } from "lucide-react"

export function BackupRestore() {
  const { state, dispatch } = useFamily()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2)
      const blob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `famiapp-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setSuccess("Backup erfolgreich exportiert!")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError("Export fehlgeschlagen")
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data && data.children && data.tasks && data.settings) {
          if (confirm("Aktuelle Daten werden ersetzt. Fortfahren?")) {
            dispatch({ type: "LOAD_STATE", payload: data })
            setSuccess("Backup erfolgreich importiert!")
            setTimeout(() => setSuccess(null), 3000)
          }
        } else {
          setError("Ungültige Backup-Datei")
          setTimeout(() => setError(null), 3000)
        }
      } catch (err) {
        setError("Fehler beim Lesen der Datei")
        setTimeout(() => setError(null), 3000)
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Backup & Wiederherstellen</h3>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600 text-sm">
          {success}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleExport} variant="outline" className="flex-1 gap-2 bg-transparent">
          <Download className="w-4 h-4" />
          Exportieren
        </Button>
        <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1 gap-2">
          <Upload className="w-4 h-4" />
          Importieren
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>

      <p className="text-xs text-muted-foreground">
        Exportiere deine Daten als JSON-Datei oder importiere ein bestehendes Backup.
      </p>
    </div>
  )
}
