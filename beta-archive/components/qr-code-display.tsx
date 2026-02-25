// Moved from components/family-sync/qr-code-display.tsx

"use client"

import { useEffect, useRef } from "react"
import QRCodeStyling from "qr-code-styling"

export function QRCodeDisplay({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const qrCode = new QRCodeStyling({
      width: 256,
      height: 256,
      data: code,
      dotsOptions: {
        color: "#000000",
        type: "rounded",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
      },
    })

    if (ref.current) {
      ref.current.innerHTML = ""
      qrCode.append(ref.current)
    }
  }, [code])

  return <div ref={ref} className="flex justify-center my-4" />
}
