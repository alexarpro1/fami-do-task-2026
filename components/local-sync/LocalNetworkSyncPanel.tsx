"use client"

import { Wifi } from "lucide-react"

export function LocalNetworkSyncPanel() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Wifi className="h-4 w-4" />
        Lokales Netzwerk (WLAN / Nearby)
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Peer-Sync im heimischen WLAN laeuft ueber die integrierte Local-Sync-Laufzeit
        (lib/local-sync). In den Einstellungen Cloud-Sync fuer Internet-Geraete nutzen;
        fuer direkte Geraete-Kopplung die APK-Funktionen „In der Naehe“ bzw. QR-Pairing
        auf dem Geraet.
      </p>
    </div>
  )
}
