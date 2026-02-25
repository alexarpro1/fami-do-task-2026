"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export type TimerTheme = "rocket" | "tooth" | "circle"

interface VisualTimerProps {
  duration: number
  timeLeft: number
  isActive: boolean
  theme: TimerTheme
}

export function VisualTimer({ duration, timeLeft, isActive, theme }: VisualTimerProps) {
  const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  if (theme === "rocket") {
    return (
      <div className="relative w-full h-64 bg-card rounded-3xl overflow-hidden border-4 border-border dark:bg-muted">
        {/* Stars Background */}
        <div className="absolute inset-0 opacity-50">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-foreground/80 rounded-full"
              style={{
                width: Math.random() * 3 + 1 + "px",
                height: Math.random() * 3 + 1 + "px",
                top: Math.random() * 100 + "%",
                left: Math.random() * 100 + "%",
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: Math.random() * 2 + 1,
                repeat: Number.POSITIVE_INFINITY,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Planet Target */}
        <motion.div
          className="absolute top-4 right-4 text-4xl"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
        >
          🪐
        </motion.div>

        {/* Rocket */}
        <motion.div
          className="absolute text-6xl"
          style={{ rotate: 45 }}
          animate={{
            bottom: `${progress * 0.7 + 5}%`,
            left: `${progress * 0.7 + 5}%`,
          }}
          transition={{ type: "spring", stiffness: 50 }}
        >
          🚀
          {isActive && (
            <motion.div
              className="absolute -bottom-4 -left-4 text-3xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 0.2, repeat: Number.POSITIVE_INFINITY }}
            >
              🔥
            </motion.div>
          )}
        </motion.div>

        {/* Trail */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line
            x1="10%"
            y1="90%"
            x2={`${progress * 0.7 + 10}%`}
            y2={`${90 - progress * 0.7}%`}
            stroke="currentColor"
            className="text-muted-foreground/20"
            strokeWidth="4"
            strokeDasharray="10,10"
          />
        </svg>

        {/* Time Display */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-secondary/80 rounded-full px-6 py-2">
          <span className="font-mono text-3xl font-bold text-foreground">{formatTime(timeLeft)}</span>
        </div>
      </div>
    )
  }

  if (theme === "tooth") {
    return (
      <div className="relative w-full h-64 bg-secondary rounded-3xl overflow-hidden border-4 border-border flex items-center justify-center">
        <div className="relative w-40 h-40">
          {/* Dirty Tooth Base */}
          <div className="text-[8rem] absolute inset-0 flex items-center justify-center opacity-30 grayscale">🦷</div>

          {/* Clean Tooth Overlay */}
          <div
            className="text-[8rem] absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-500"
            style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }}
          >
            🦷
          </div>

          {/* Sparkles */}
          {progress > 30 && (
            <motion.div
              className="absolute -top-2 -right-2 text-3xl"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
            >
              ✨
            </motion.div>
          )}
          {progress > 60 && (
            <motion.div
              className="absolute -bottom-2 -left-2 text-3xl"
              animate={{ scale: [1, 1.2, 1], rotate: [0, -15, 15, 0] }}
              transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY, delay: 0.1 }}
            >
              ✨
            </motion.div>
          )}
          {progress > 90 && (
            <motion.div
              className="absolute top-4 -left-6 text-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
            >
              ✨
            </motion.div>
          )}
        </div>

        {/* Toothbrush Animation */}
        {isActive && (
          <motion.div
            className="absolute text-5xl"
            animate={{
              x: [0, 30, -30, 0],
              y: [0, -15, 15, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8 }}
            style={{ top: "45%", left: "55%" }}
          >
            🪥
          </motion.div>
        )}

        {/* Time Display */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/80 rounded-full px-6 py-2 shadow-md">
          <span className="font-mono text-3xl font-bold text-primary">{formatTime(timeLeft)}</span>
        </div>

        {/* Progress Text */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/60 rounded-full px-4 py-1">
          <span className="text-sm font-medium text-foreground">{Math.round(progress)}% sauber</span>
        </div>
      </div>
    )
  }

  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (circumference * progress) / 100

  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background Circle */}
        <circle cx="50%" cy="50%" r="45%" className="stroke-secondary fill-none" strokeWidth="12" />
        {/* Progress Circle */}
        <motion.circle
          cx="50%"
          cy="50%"
          r="45%"
          className="stroke-primary fill-none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "linear" }}
        />
      </svg>

      {/* Center Content */}
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold font-mono text-foreground">{formatTime(timeLeft)}</span>
        <span className={cn("text-sm mt-2 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
          {isActive ? "Laeuft..." : "Pausiert"}
        </span>
      </div>
    </div>
  )
}
