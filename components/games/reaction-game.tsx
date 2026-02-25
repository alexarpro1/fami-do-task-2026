"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Phase = "wait" | "ready" | "green" | "too-early" | "done"

const POINTS_FAST = 15
const POINTS_MED = 10
const POINTS_SLOW = 5
const REACTION_STORAGE_KEY = "famiapp-reaction-progress"
const REACTION_XP_FAST = 15
const REACTION_XP_MED = 10
const REACTION_XP_SLOW = 5
const REACTION_XP_PER_LEVEL = 100

interface ReactionGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
}

export function ReactionGame({ onAwardPoints, onClose }: ReactionGameProps) {
  const [phase, setPhase] = useState<Phase>("wait")
  const [round, setRound] = useState(1)
  const [reactionMs, setReactionMs] = useState<number | null>(null)
  const [greenAt, setGreenAt] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [bestMsThisSession, setBestMsThisSession] = useState<number | null>(null)

  const startRound = useCallback(() => {
    setPhase("wait")
    setReactionMs(null)
    setGreenAt(null)
    const delay = 1500 + Math.random() * 2500
    const greenTime = Date.now() + delay
    setGreenAt(greenTime)
    const t = setTimeout(() => {
      setPhase("green")
      setGreenAt(Date.now())
    }, delay)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (phase === "wait") {
      setCountdown(3)
      const i = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
      return () => clearInterval(i)
    }
    setCountdown(0)
  }, [phase])

  useEffect(() => {
    if (phase === "wait") startRound()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REACTION_STORAGE_KEY)
      if (raw) {
        const { level: l = 1, xp: x = 0 } = JSON.parse(raw)
        setLevel(l)
        setXp(x)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleClick = () => {
    if (phase === "green") {
      const ms = greenAt ? Math.round(Date.now() - greenAt) : 0
      setReactionMs(ms)
      let points = POINTS_SLOW
      let addXp = REACTION_XP_SLOW
      if (ms < 300) {
        points = POINTS_FAST
        addXp = REACTION_XP_FAST
      } else if (ms < 500) {
        points = POINTS_MED
        addXp = REACTION_XP_MED
      }
      onAwardPoints(points, ms < 300 ? "Super schnell! ⚡" : ms < 500 ? "Gut! 👍" : "Geschafft! 🎉", "Reaktionsspiel: Runde")
      setXp((prev) => {
        const next = prev + addXp
        const newLevel = Math.max(1, Math.floor(next / REACTION_XP_PER_LEVEL) + 1)
        setLevel(newLevel)
        try {
          localStorage.setItem(REACTION_STORAGE_KEY, JSON.stringify({ level: newLevel, xp: next }))
        } catch {
          // ignore
        }
        return next
      })
      setBestMsThisSession((prev) => (prev == null || ms < prev ? ms : prev))
      setPhase("done")
      return
    }
    if (phase === "wait") {
      setPhase("too-early")
      setTimeout(() => setPhase("wait"), 800)
    }
  }

  const nextRound = () => {
    setRound((r) => r + 1)
    setPhase("wait")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Runde {round}. Warte auf Grün, dann so schnell wie möglich klicken!
        </p>
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          Level {level}
        </span>
      </div>
      {phase === "done" ? (
        <div
          className={cn(
            "w-full min-h-[280px] rounded-2xl border-2 transition-colors flex flex-col items-center justify-center gap-4 bg-muted/50 border-border",
          )}
        >
          <span className="text-2xl font-bold text-foreground">
            {reactionMs != null ? `${reactionMs} ms` : ""}
          </span>
          {reactionMs != null && (
            <span className="text-sm text-muted-foreground">
              {reactionMs < 300 ? "Blitzschnell! ⚡" : reactionMs < 500 ? "Schnell! 👍" : "Gut getroffen! 🎯"}
            </span>
          )}
          {bestMsThisSession != null && (
            <span className="text-xs text-muted-foreground">
              Beste Zeit diese Runde: {bestMsThisSession} ms
            </span>
          )}
          <Button onClick={nextRound}>Nächste Runde</Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "w-full min-h-[280px] rounded-2xl border-2 transition-colors flex flex-col items-center justify-center gap-4",
            phase === "green" && "bg-green-500 border-green-400 animate-pulse",
            phase === "wait" && "bg-muted/50 border-border",
            phase === "too-early" && "bg-red-500/30 border-red-500",
          )}
        >
          {phase === "wait" && (
            <>
              <span className="text-4xl font-bold text-muted-foreground">Warte...</span>
              {countdown > 0 && <span className="text-2xl text-muted-foreground">{countdown}</span>}
            </>
          )}
          {phase === "green" && <span className="text-4xl font-bold text-white">KLICK! 👆</span>}
          {phase === "too-early" && <span className="text-2xl font-bold text-red-200">Zu früh! Nochmal warten.</span>}
        </button>
      )}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Beenden
        </Button>
      </div>
    </div>
  )
}
