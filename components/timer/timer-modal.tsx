"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Play, Pause, RotateCcw, Check, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VisualTimer, type TimerTheme } from "./visual-timer"
import { useTimer } from "@/hooks/use-timer"
import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import type { Task } from "@/types"

interface TimerModalProps {
  task: Task
  childId: string
  onClose: () => void
  onComplete: () => void
}

const TIMER_THEMES: { id: TimerTheme; label: string; emoji: string }[] = [
  { id: "circle", label: "Kreis", emoji: "⭕" },
  { id: "rocket", label: "Rakete", emoji: "🚀" },
  { id: "tooth", label: "Zaehne", emoji: "🦷" },
]

export function TimerModal({ task, childId, onClose, onComplete }: TimerModalProps) {
  const { dispatch, state } = useFamily()
  const { completeTask } = useSupabaseMutations()
  const [theme, setTheme] = useState<TimerTheme>("circle")
  const [soundEnabled, setSoundEnabled] = useState(state.settings.timerSoundEnabled)
  const [showConfetti, setShowConfetti] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)

  const durationSeconds = (task.duration || 3) * 60

  const { seconds, isRunning, isComplete, toggle, reset } = useTimer({
    initialSeconds: durationSeconds,
    onComplete: handleTimerComplete,
  })

  function handleTimerComplete() {
    if (soundEnabled) {
      try {
        const audio = new Audio("/sounds/complete.mp3")
        audio.play().catch(() => {})
      } catch {}
    }

    void completeTask(task.id, childId, true, task.points)

    setEarnedPoints(task.points)
    if (state.settings.showConfetti) setShowConfetti(true)

    setTimeout(() => {
      onComplete()
    }, 2500)
  }

  const handleManualComplete = () => {
    void completeTask(task.id, childId, true, task.points)

    setEarnedPoints(task.points)
    if (state.settings.showConfetti) setShowConfetti(true)

    setTimeout(() => {
      onComplete()
    }, 2500)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isRunning && !isComplete) {
        toggle()
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {showConfetti && (
            <>
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181"][i % 5],
                      left: `${Math.random() * 100}%`,
                      top: "-10px",
                    }}
                    animate={{
                      y: ["0", "400px"],
                      x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200],
                      rotate: [0, Math.random() * 720],
                      opacity: [1, 0],
                    }}
                    transition={{
                      duration: 1.5 + Math.random(),
                      delay: Math.random() * 0.3,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>

              {/* Points Popup - Use semantic colors */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center z-10"
              >
                <div className="bg-primary text-primary-foreground font-bold px-8 py-6 rounded-2xl shadow-xl text-center">
                  <div className="text-5xl">+{earnedPoints}</div>
                  <div className="text-xl mt-1">Punkte!</div>
                </div>
              </motion.div>
            </>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{task.emoji}</span>
              <div>
                <h2 className="font-bold text-lg text-foreground">{task.title}</h2>
                <p className="text-sm text-muted-foreground">{task.duration} Minuten</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Timer Visualization */}
          <div className="mb-6">
            <VisualTimer duration={durationSeconds} timeLeft={seconds} isActive={isRunning} theme={theme} />
          </div>

          {/* Theme Selector */}
          <div className="flex justify-center gap-2 mb-6">
            {TIMER_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-all
                  ${
                    theme === t.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:text-foreground"
                  }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="rounded-full w-12 h-12 bg-transparent"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>

            <Button
              size="icon"
              onClick={toggle}
              disabled={showConfetti}
              className={`rounded-full w-16 h-16 ${isRunning ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "bg-primary hover:bg-primary/90 text-primary-foreground"}`}
            >
              {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
            </Button>

            <Button
              size="icon"
              variant="outline"
              onClick={reset}
              disabled={showConfetti}
              className="rounded-full w-12 h-12 bg-transparent"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>

          {/* Complete Button */}
          <Button
            onClick={handleManualComplete}
            disabled={showConfetti}
            className="w-full mt-6 rounded-xl h-12"
            variant="secondary"
          >
            <Check className="w-5 h-5 mr-2" />
            Jetzt abschliessen
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
