"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCode, Download } from "lucide-react"
import QRCodeLib from "qrcode"

interface QRCodeDisplayProps {
  code: string
  familyName: string
}

export function QRCodeDisplay({ code, familyName }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  const generateQR = async () => {
    try {
      // Create join URL with family code
      const joinUrl = `${window.location.origin}?join=${code}`

      const dataUrl = await QRCodeLib.toDataURL(joinUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error("[FdT] QR Code generation error:", error)
    }
  }

  const downloadQR = () => {
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `famiapp-${code}.png`
    a.click()
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {!qrDataUrl ? (
          <Button onClick={generateQR} className="w-full bg-transparent" variant="outline">
            <QrCode className="h-4 w-4 mr-2" />
            QR-Code generieren
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img src={qrDataUrl || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-mono text-2xl font-bold">{code}</p>
              <p className="text-sm text-muted-foreground">{familyName}</p>
            </div>
            <Button onClick={downloadQR} className="w-full bg-transparent" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              QR-Code herunterladen
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Andere können diesen QR-Code scannen um der Familie beizutreten
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
