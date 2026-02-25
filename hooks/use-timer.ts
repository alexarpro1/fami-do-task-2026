"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseTimerProps {
  initialSeconds: number
  onComplete?: () => void
  autoStart?: boolean
}

interface UseTimerReturn {
  seconds: number
  isRunning: boolean
  isComplete: boolean
  progress: number
  start: () => void
  pause: () => void
  reset: () => void
  toggle: () => void
}

export function useTimer({ initialSeconds, onComplete, autoStart = false }: UseTimerProps): UseTimerReturn {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isComplete, setIsComplete] = useState(false)
  const onCompleteRef = useRef(onComplete)

  // Update ref when callback changes
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Timer logic
  useEffect(() => {
    if (!isRunning || seconds <= 0) return

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          setIsComplete(true)
          onCompleteRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, seconds])

  const start = useCallback(() => {
    if (seconds > 0) {
      setIsRunning(true)
    }
  }, [seconds])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    setSeconds(initialSeconds)
    setIsRunning(false)
    setIsComplete(false)
  }, [initialSeconds])

  const toggle = useCallback(() => {
    if (isRunning) {
      pause()
    } else {
      start()
    }
  }, [isRunning, pause, start])

  const progress = initialSeconds > 0 ? ((initialSeconds - seconds) / initialSeconds) * 100 : 0

  return {
    seconds,
    isRunning,
    isComplete,
    progress,
    start,
    pause,
    reset,
    toggle,
  }
}

// Format seconds to MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}
