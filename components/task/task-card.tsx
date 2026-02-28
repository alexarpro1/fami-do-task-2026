"use client"

import { useState, useMemo, useRef } from "react"
import type { Task } from "@/types"
import { useFamily } from "@/context/family-context"
import { cn } from "@/lib/utils"
import { Check, Clock, Play, Pause, RotateCcw, Star, Maximize2, AlertCircle, Ban } from "lucide-react"
import { useTimer, formatTime } from "@/hooks/use-timer"
import { Button } from "@/components/ui/button"
import { TimerModal } from "@/components/timer/timer-modal"
import { FocusTimer } from "@/components/timer/focus-timer"
import { ConfettiEffect } from "@/components/effects/confetti-effect"

interface TaskCardProps {
  task: Task
  childId: string
  isCompleted: boolean
  onComplete?: () => void
}

export function TaskCard({ task, childId, isCompleted, onComplete }: TaskCardProps) {
  const { dispatch, state, todayCompletions } = useFamily()
  const [showTimer, setShowTimer] = useState(false)
  const [showTimerModal, setShowTimerModal] = useState(false)
  const [showFocusTimer, setShowFocusTimer] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [showTimerSelection, setShowTimerSelection] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const durationSeconds = (task.duration || 0) * 60

  const { seconds, isRunning, isComplete, progress, toggle, reset } = useTimer({
    initialSeconds: durationSeconds,
    onComplete: () => {
      handleComplete(true)
    },
  })

  const limitInfo = useMemo(() => {
    if (!task.dailyLimit || task.dailyLimit <= 0) return { isLimitReached: false, remaining: null, total: null }

    const completionsToday = (todayCompletions ?? []).filter(
      (tc) => tc.taskId === task.id && tc.childId === childId,
    ).length

    const remaining = task.dailyLimit - completionsToday
    return {
      isLimitReached: remaining <= 0,
      remaining: Math.max(0, remaining),
      total: task.dailyLimit,
    }
  }, [task.dailyLimit, task.id, childId, todayCompletions])

  const timeWindowStatus = useMemo(() => {
    if (!task.startTime && !task.endTime) return { status: "available", message: null }

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    let startMinutes = 0
    let endMinutes = 24 * 60

    if (task.startTime) {
      const [h, m] = task.startTime.split(":").map(Number)
      startMinutes = h * 60 + m
    }

    if (task.endTime) {
      const [h, m] = task.endTime.split(":").map(Number)
      endMinutes = h * 60 + m
    }

    if (currentMinutes < startMinutes) {
      const waitHours = Math.floor((startMinutes - currentMinutes) / 60)
      const waitMins = (startMinutes - currentMinutes) % 60
      return {
        status: "upcoming",
        message: `Verfuegbar in ${waitHours > 0 ? `${waitHours}h ` : ""}${waitMins}min`,
      }
    }

    if (currentMinutes > endMinutes) {
      return { status: "overdue", message: "Zeitfenster abgelaufen" }
    }

    const remainingMins = endMinutes - currentMinutes
    if (remainingMins <= 30) {
      return { status: "urgent", message: `Noch ${remainingMins} Min` }
    }

    return { status: "available", message: null }
  }, [task.startTime, task.endTime])

  const canComplete = useMemo(() => {
    if (isCompleted) return false
    if (timeWindowStatus.status === "overdue") return false
    if (limitInfo.isLimitReached) return false
    return true
  }, [isCompleted, timeWindowStatus.status, limitInfo.isLimitReached])

  const formatTimeWindow = () => {
    if (!task.startTime && !task.endTime) return null
    if (task.startTime && task.endTime) return `${task.startTime} - ${task.endTime}`
    if (task.startTime) return `ab ${task.startTime}`
    if (task.endTime) return `bis ${task.endTime}`
    return null
  }

  const scheduleConfettiOff = () => {
    if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current)
    confettiTimeoutRef.current = setTimeout(() => {
      setJustCompleted(false)
      setShowConfetti(false)
    }, 2000)
  }

  const handleComplete = (withTimer: boolean) => {
    if (!canComplete) return

    dispatch({
      type: "COMPLETE_TASK",
      payload: { taskId: task.id, childId, withTimer },
    })

    setJustCompleted(true)
    if (state.settings.showConfetti) {
      setShowConfetti(true)
      scheduleConfettiOff()
    } else {
      setTimeout(() => setJustCompleted(false), 2000)
    }
    onComplete?.()
  }

  const handleQuickComplete = () => {
    handleComplete(false)
  }

  const handleToggleTimer = () => {
    if (!showTimer) {
      setShowTimer(true)
    }
    toggle()
  }

  const handleTimerModalComplete = () => {
    setShowTimerModal(false)
    setJustCompleted(true)
    if (state.settings.showConfetti) {
      setShowConfetti(true)
      scheduleConfettiOff()
    } else {
      setTimeout(() => setJustCompleted(false), 2000)
    }
    onComplete?.()
  }

  const handleFocusTimerClose = () => {
    setShowFocusTimer(false)
  }

  const enabledTimerCount = useMemo(() => {
    if (!task.duration) return 0
    let count = 0
    if (task.timerOptions?.showMiniTimer ?? true) count++
    if (task.timerOptions?.showVisualTimer ?? true) count++
    if (task.timerOptions?.showFocusTimer ?? true) count++
    return count
  }, [task.duration, task.timerOptions])

  const handleCardClick = () => {
    if (!task.duration || !canComplete || isCompleted) return

    if (enabledTimerCount === 1) {
      if (task.timerOptions?.showMiniTimer) {
        setShowTimer(true)
      } else if (task.timerOptions?.showVisualTimer) {
        setShowTimerModal(true)
      } else if (task.timerOptions?.showFocusTimer) {
        setShowFocusTimer(true)
      }
    } else if (enabledTimerCount > 1) {
      setShowTimerSelection(true)
    }
  }

  const difficultyColors = {
    easy: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    medium:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    hard: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  }

  const timeWindowColors = {
    available: "",
    upcoming: "opacity-60",
    urgent: "ring-2 ring-amber-500",
    overdue: "opacity-40 ring-2 ring-destructive",
  }

  return (
    <>
      {showConfetti && <ConfettiEffect />}

      <div
        onClick={enabledTimerCount > 0 && !showTimer ? handleCardClick : undefined}
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          isCompleted ? "bg-success/10" : "bg-card",
          justCompleted && "animate-bounce-in",
          !isCompleted && "neu-flat",
          !isCompleted && timeWindowColors[timeWindowStatus.status as keyof typeof timeWindowColors],
          limitInfo.isLimitReached && !isCompleted && "opacity-50 ring-2 ring-muted",
          enabledTimerCount > 0 && !isCompleted && canComplete && "cursor-pointer hover:scale-[1.02]",
        )}
      >
        {justCompleted && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="animate-bounce-in bg-success text-success-foreground px-4 py-2 rounded-full font-bold text-lg shadow-lg">
              +{task.points} <Star className="w-4 h-4 inline fill-current" />
            </div>
          </div>
        )}

        {showTimer && !isCompleted && (
          <div
            className="absolute top-0 left-0 h-1 bg-primary transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        )}

        {!isCompleted && (task.startTime || task.endTime) && (
          <div
            className={cn(
              "absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              timeWindowStatus.status === "available" && "bg-primary/10 text-primary",
              timeWindowStatus.status === "upcoming" && "bg-muted text-muted-foreground",
              timeWindowStatus.status === "urgent" && "bg-amber-500/20 text-amber-600",
              timeWindowStatus.status === "overdue" && "bg-destructive/20 text-destructive",
            )}
          >
            <Clock className="w-3 h-3" />
            <span>{formatTimeWindow()}</span>
            {timeWindowStatus.status === "overdue" && <AlertCircle className="w-3 h-3" />}
          </div>
        )}

        {!isCompleted && task.dailyLimit && task.dailyLimit > 0 && (
          <div
            className={cn(
              "absolute top-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              task.startTime || task.endTime ? "right-28" : "right-2",
              limitInfo.isLimitReached ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground",
            )}
          >
            {limitInfo.isLimitReached ? (
              <>
                <Ban className="w-3 h-3" />
                <span>Limit</span>
              </>
            ) : (
              <span>
                {limitInfo.remaining}/{limitInfo.total}
              </span>
            )}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleQuickComplete()
              }}
              disabled={!canComplete}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-all",
                isCompleted
                  ? "bg-success text-success-foreground"
                  : canComplete
                    ? "bg-secondary hover:scale-110 active:scale-95"
                    : "bg-muted cursor-not-allowed",
              )}
            >
              {isCompleted ? (
                <Check className="w-6 h-6" />
              ) : limitInfo.isLimitReached ? (
                <Ban className="w-6 h-6 text-muted-foreground" />
              ) : (
                task.emoji
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className={cn(
                      "font-semibold text-foreground",
                      (isCompleted || limitInfo.isLimitReached) && "line-through text-muted-foreground",
                    )}
                  >
                    {task.title}
                  </h3>
                  {task.description && <p className="text-sm text-muted-foreground mt-0.5">{task.description}</p>}
                </div>

                <div
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium shrink-0",
                    isCompleted ? "bg-success/20 text-success" : "bg-points/20 text-points-foreground",
                    (task.startTime || task.endTime || task.dailyLimit) && "mt-5",
                  )}
                >
                  {limitInfo.isLimitReached ? (
                    <>
                      <Ban className="w-3 h-3" />
                      <span>Limit</span>
                    </>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{task.points}</span>
                    </>
                  )}
                </div>
              </div>

              {!isCompleted && (timeWindowStatus.message || limitInfo.isLimitReached) && (
                <div
                  className={cn(
                    "flex items-center gap-1 mt-1 text-xs",
                    timeWindowStatus.status === "upcoming" && "text-muted-foreground",
                    timeWindowStatus.status === "urgent" && "text-amber-600 font-medium",
                    timeWindowStatus.status === "overdue" && "text-destructive font-medium",
                    limitInfo.isLimitReached && "text-destructive font-medium",
                  )}
                >
                  {limitInfo.isLimitReached ? (
                    <>
                      <Ban className="w-3 h-3" />
                      Tageslimit erreicht
                    </>
                  ) : (
                    <>
                      {timeWindowStatus.status === "urgent" && <AlertCircle className="w-3 h-3" />}
                      {timeWindowStatus.message}
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn("px-2 py-0.5 rounded-full text-xs border", difficultyColors[task.difficulty])}>
                  {task.difficulty === "easy" ? "Leicht" : task.difficulty === "medium" ? "Mittel" : "Schwer"}
                </span>

                {task.duration && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {task.duration} Min
                  </span>
                )}
              </div>

              {task.duration && canComplete && (
                <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  {showTimer ? (
                    <>
                      <div
                        className={cn(
                          "font-mono text-lg font-bold",
                          isRunning ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {formatTime(seconds)}
                      </div>
                      <Button size="sm" variant="ghost" onClick={toggle} className="rounded-full h-8 w-8 p-0">
                        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={reset} className="rounded-full h-8 w-8 p-0">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowTimerModal(true)}
                        className="rounded-full h-8 w-8 p-0"
                        title="Vollbild-Timer"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleComplete(true)} className="ml-auto rounded-full h-8 px-3">
                        <Check className="w-4 h-4 mr-1" />
                        Fertig
                      </Button>
                    </>
                  ) : (
                    <>
                      {enabledTimerCount > 1 && !showTimerSelection && (
                        <div className="text-xs text-muted-foreground">
                          Tippe auf die Karte, um einen Timer auszuwählen
                        </div>
                      )}

                      {showTimerSelection && (
                        <div className="flex gap-2 flex-wrap animate-fadeIn">
                          {(task.timerOptions?.showMiniTimer ?? true) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowTimer(true)
                                setShowTimerSelection(false)
                              }}
                              className="rounded-full h-8"
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              Mini-Timer
                            </Button>
                          )}
                          {(task.timerOptions?.showVisualTimer ?? true) && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setShowTimerModal(true)
                                setShowTimerSelection(false)
                              }}
                              className="rounded-full h-8"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Visual Timer
                            </Button>
                          )}
                          {(task.timerOptions?.showFocusTimer ?? true) && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setShowFocusTimer(true)
                                setShowTimerSelection(false)
                              }}
                              className="rounded-full h-8"
                            >
                              <Maximize2 className="w-4 h-4 mr-1" />
                              Fokus
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTimerModal && (
        <TimerModal
          task={task}
          childId={childId}
          onClose={() => setShowTimerModal(false)}
          onComplete={handleTimerModalComplete}
        />
      )}

      {showFocusTimer && (
        <FocusTimer
          task={task}
          onClose={handleFocusTimerClose}
          theme={state?.settings?.theme === "tooth" ? "tooth" : "circle"}
        />
      )}
    </>
  )
}
