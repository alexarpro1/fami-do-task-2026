"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check, ExternalLink } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function GoogleDriveSetupHelper() {
  const [copiedRedirect, setCopiedRedirect] = useState(false)
  const [copiedOrigin, setCopiedOrigin] = useState(false)

  // Get current URLs
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : ""
  const redirectUri = `${currentOrigin}/admin`
  const authorizedOrigin = currentOrigin

  const handleCopy = async (text: string, type: "redirect" | "origin") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "redirect") {
        setCopiedRedirect(true)
        setTimeout(() => setCopiedRedirect(false), 2000)
      } else {
        setCopiedOrigin(true)
        setTimeout(() => setCopiedOrigin(false), 2000)
      }
      toast({
        title: "Kopiert!",
        description: "URI wurde in die Zwischenablage kopiert",
      })
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Konnte nicht kopiert werden",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="p-4 bg-muted/50 border-2 border-dashed">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-sm mb-1">Google Cloud Console Setup</h4>
            <p className="text-xs text-muted-foreground">Konfiguriere diese URIs in deiner Google Cloud Console</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open("https://console.cloud.google.com/apis/credentials", "_blank")}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Console öffnen
          </Button>
        </div>

        {/* Redirect URI */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Autorisierte Weiterleitungs-URIs:</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-background border rounded-md px-3 py-2 text-xs font-mono break-all">
              {redirectUri}
            </div>
            <Button size="sm" variant="outline" onClick={() => handleCopy(redirectUri, "redirect")} className="h-auto">
              {copiedRedirect ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* JavaScript Origin */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Autorisierte JavaScript-Ursprünge:</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-background border rounded-md px-3 py-2 text-xs font-mono break-all">
              {authorizedOrigin}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(authorizedOrigin, "origin")}
              className="h-auto"
            >
              {copiedOrigin ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          💡 Tipp: Änderungen in der Google Console können 5-10 Minuten dauern bis sie aktiv sind.
        </div>
      </div>
    </Card>
  )
}
