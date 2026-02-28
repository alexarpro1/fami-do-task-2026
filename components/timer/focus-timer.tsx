"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import { triggerSuccess } from "@/lib/haptics"
import type { Task } from "@/types"
import { X, Check, Pause, Play, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { VisualTimer, type TimerTheme } from "./visual-timer"

interface FocusTimerProps {
  task: Task
  onClose: () => void
  theme?: TimerTheme
}

export function FocusTimer({ task, onClose, theme = "circle" }: FocusTimerProps) {
  const { state } = useFamily()
  const { completeTask } = useSupabaseMutations()
  const duration = (task.duration || 5) * 60
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isActive, setIsActive] = useState(true)
  const [isOverTime, setIsOverTime] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isActive && !isCompleted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            setIsOverTime(true)
            return prev - 1
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive, isCompleted])

  const handleComplete = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsCompleted(true)

    const basePoints = task.points || 10
    const points = isOverTime ? Math.floor(basePoints * 0.5) : basePoints
    setEarnedPoints(points)

    if (state.selectedChildId) {
      void completeTask(task.id, state.selectedChildId, true, points)
    }
    void triggerSuccess()

    if (state.settings.showConfetti) setShowConfetti(true)

    if (state.settings?.soundEnabled) {
      try {
        const audio = new Audio("/sounds/success.mp3")
        audio.volume = 0.5
        audio.play().catch(() => {})
      } catch {}
    }

    setTimeout(onClose, 4000)
  }

  const togglePause = () => {
    setIsActive(!isActive)
  }

  const formatTime = (seconds: number) => {
    const isNegative = seconds < 0
    const absSeconds = Math.abs(seconds)
    const m = Math.floor(absSeconds / 60)
    const s = absSeconds % 60
    return `${isNegative ? "-" : ""}${m}:${s < 10 ? "0" : ""}${s}`
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6">
      {/* Confetti Effect */}
      {showConfetti && (
        <>
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181"][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: "-10px",
                }}
                animate={{
                  y: ["0vh", "100vh"],
                  x: [0, (Math.random() - 0.5) * 200],
                  rotate: [0, Math.random() * 720],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 10, stiffness: 100 }}
            className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]"
          >
            <div className="bg-primary text-primary-foreground font-bold px-12 py-8 rounded-3xl shadow-2xl border-4 border-primary/30 text-center">
              <div className="text-7xl drop-shadow-lg">+{earnedPoints}</div>
              <div className="text-3xl mt-2">Punkte</div>
            </div>
          </motion.div>
        </>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-secondary rounded-full text-muted-foreground hover:bg-secondary/80 transition-colors"
      >
        <X size={24} />
      </button>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md text-center space-y-6"
      >
        {/* Task Emoji */}
        <div className="text-8xl animate-bounce">{task.emoji}</div>

        {/* Task Title */}
        <h2 className="text-4xl font-bold text-foreground">{task.title}</h2>

        {task.note && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-sm">
            <div className="bg-muted/50 rounded-xl p-4 border-l-4 border-muted-foreground/30">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground italic text-left">{task.note}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Visual Timer */}
        <VisualTimer duration={duration} timeLeft={Math.max(0, timeLeft)} isActive={isActive} theme={theme} />

        {isOverTime && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-destructive font-bold text-xl animate-pulse"
          >
            Zeit ueberschritten: {formatTime(timeLeft)}
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          {!isCompleted && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePause}
                className="p-4 rounded-full bg-secondary text-secondary-foreground shadow-lg"
              >
                {isActive ? <Pause size={32} /> : <Play size={32} />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleComplete}
                className={cn(
                  "flex-1 py-6 rounded-3xl font-bold text-2xl shadow-xl flex items-center justify-center gap-3 transition-colors",
                  isOverTime
                    ? "bg-accent text-accent-foreground border-4 border-accent/50"
                    : "bg-primary text-primary-foreground shadow-primary/30",
                )}
              >
                <Check size={32} strokeWidth={4} />
                {isOverTime ? "Trotzdem fertig!" : "Erledigt!"}
              </motion.button>
            </>
          )}
        </div>

        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-2xl font-bold p-6 rounded-3xl border-4",
                isOverTime
                  ? "text-accent-foreground bg-accent border-accent/50"
                  : "text-success-foreground bg-success border-success/50",
              )}
            >
              {isOverTime ? "Gut gemacht! Naechstes Mal schneller!" : "Super! Volle Punktzahl!"}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
