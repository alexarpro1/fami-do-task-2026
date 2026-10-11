"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Phone } from "lucide-react"
import { useSyncId } from "@/hooks/useSyncId"
import { useFamily } from "@/context/family-context"
import { createCallInviteListener, type CallInvitePayload } from "@/lib/audio/call-invite"
import { getDeviceId } from "@/hooks/useSyncSession"
import {
  requestNotificationPermission,
  sendIncomingCallNotification,
} from "@/lib/notifications"
import { Button } from "@/components/ui/button"

/**
 * Lauscht familienweit auf Anruf-Einladungen (Metered).
 * Zeigt Banner + Local Notification; Tap → /audio.
 */
export function CallInviteRunner() {
  const { syncId } = useSyncId()
  const { state } = useFamily()
  const router = useRouter()
  const [invite, setInvite] = useState<CallInvitePayload | null>(null)
  const lastInviteAtRef = useRef(0)
  const myDeviceIdRef = useRef("")

  const audioEnabled = state.settings?.audioCommunicationEnabled ?? false

  useEffect(() => {
    myDeviceIdRef.current = getDeviceId()
  }, [])

  useEffect(() => {
    if (!audioEnabled || !syncId) return

    void requestNotificationPermission()

    const listener = createCallInviteListener({
      syncId,
      onInvite: (payload) => {
        if (payload.fromDeviceId && payload.fromDeviceId === myDeviceIdRef.current) return
        if (Date.now() - lastInviteAtRef.current < 2500) return
        lastInviteAtRef.current = Date.now()
        setInvite(payload)
        void sendIncomingCallNotification({
          fromName: payload.fromName,
          roomId: payload.roomId,
        })
      },
    })

    return () => listener.close()
  }, [audioEnabled, syncId])

  if (!invite || !audioEnabled) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] flex justify-center px-3">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-emerald-500/40 bg-card/95 p-3 shadow-lg backdrop-blur">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Phone className="h-4 w-4 text-emerald-600" />
          Eingehender Anruf
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          {invite.fromName} möchte sprechen (Raum {invite.roomId}).
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1"
            onClick={() => {
              setInvite(null)
              router.push("/audio")
            }}
          >
            Annehmen
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setInvite(null)}>
            Später
          </Button>
        </div>
      </div>
    </div>
  )
}
