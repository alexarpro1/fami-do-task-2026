"use client"

import { useState, useRef, useEffect } from "react"
import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import type { Task, TaskCategory, TaskDifficulty } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  Clock,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  AlertTriangle,
  Sun,
  Play,
  Maximize2,
  ChevronRight,
} from "lucide-react"
import { EmojiPicker } from "@/components/ui/emoji-picker"
import { DayPicker } from "@/components/ui/day-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { motion, AnimatePresence } from "framer-motion"

const CATEGORIES: { key: TaskCategory; label: string; emoji: string }[] = [
  { key: "morning", label: "Morgen", emoji: "🌅" },
  { key: "evening", label: "Abend", emoji: "🌙" },
  { key: "weekend", label: "Wochenende", emoji: "🎉" },
  { key: "custom", label: "Andere", emoji: "⭐" },
]

const DIFFICULTIES: { key: TaskDifficulty; label: string; points: number; color: string }[] = [
  { key: "easy", label: "Leicht", points: 5, color: "bg-green-500" },
  { key: "medium", label: "Mittel", points: 10, color: "bg-yellow-500" },
  { key: "hard", label: "Schwer", points: 20, color: "bg-red-500" },
]

const TASK_TEMPLATES = [
  {
    title: "Zähne putzen",
    emoji: "🦷",
    category: "morning" as TaskCategory,
    difficulty: "easy" as TaskDifficulty,
    points: 5,
    startTime: "06:30",
    endTime: "07:30",
  },
  {
    title: "Bett machen",
    emoji: "🛏️",
    category: "morning" as TaskCategory,
    difficulty: "easy" as TaskDifficulty,
    points: 5,
    startTime: "06:30",
    endTime: "08:00",
  },
  {
    title: "Anziehen",
    emoji: "👕",
    category: "morning" as TaskCategory,
    difficulty: "easy" as TaskDifficulty,
    points: 5,
    startTime: "06:30",
    endTime: "07:30",
  },
  {
    title: "Frühstücken",
    emoji: "🥣",
    category: "morning" as TaskCategory,
    difficulty: "easy" as TaskDifficulty,
    points: 5,
    startTime: "07:00",
    endTime: "08:00",
  },
  {
    title: "Hausaufgaben",
    emoji: "📚",
    category: "evening" as TaskCategory,
    difficulty: "medium" as TaskDifficulty,
    points: 15,
    startTime: "14:00",
    endTime: "17:00",
  },
  {
    title: "Zimmer aufräumen",
    emoji: "🧹",
    category: "evening" as TaskCategory,
    difficulty: "medium" as TaskDifficulty,
    points: 10,
  },
  {
    title: "Lesen",
    emoji: "📖",
    category: "evening" as TaskCategory,
    difficulty: "easy" as TaskDifficulty,
    points: 10,
    startTime: "19:00",
    endTime: "20:00",
  },
  {
    title: "Sport machen",
    emoji: "⚽",
    category: "weekend" as TaskCategory,
    difficulty: "medium" as TaskDifficulty,
    points: 15,
  },
]

interface TaskFormData {
  title: string
  emoji: string
  category: TaskCategory
  difficulty: TaskDifficulty
  points: number
  duration?: number
  days: string[]
  isActive: boolean
  note?: string
  dailyLimit?: number
  startTime?: string
  endTime?: string
  repeatInterval?: number
  timerOptions: {
    showMiniTimer: boolean
    showVisualTimer: boolean
    showFocusTimer: boolean
  }
}

const defaultFormData: TaskFormData = {
  title: "",
  emoji: "⭐",
  category: "morning",
  difficulty: "easy",
  points: 5,
  duration: undefined,
  days: ["mon", "tue", "wed", "thu", "fri"],
  isActive: true,
  note: "",
  dailyLimit: undefined,
  startTime: undefined,
  endTime: undefined,
  repeatInterval: undefined,
  timerOptions: {
    showMiniTimer: true,
    showVisualTimer: true,
    showFocusTimer: true,
  },
}

function InlineTaskForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  duplicateWarning,
  onTitleChange,
  isNew = false,
}: {
  formData: TaskFormData
  setFormData: (data: TaskFormData) => void
  onSave: () => void
  onCancel: () => void
  duplicateWarning: string | null
  onTitleChange: (title: string) => void
  isNew?: boolean
}) {
  const [showTimeWindow, setShowTimeWindow] = useState(!!(formData.startTime || formData.endTime))
  const [expandedSections, setExpandedSections] = useState<string[]>(isNew ? ["basic"] : ["basic", "schedule", "timer"])
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (formRef.current) {
      const rect = formRef.current.getBoundingClientRect()
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
      if (!isVisible) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

  return (
    <motion.div
      ref={formRef}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-secondary/50 rounded-xl overflow-hidden"
    >
      <div className="p-4 space-y-3">
        {/* Basic Info - Always visible */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <EmojiPicker value={formData.emoji} onChange={(emoji) => setFormData({ ...formData, emoji })} size="md" />
            <div className="flex-1 space-y-1">
              <Input
                value={formData.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Aufgabenname"
                className={cn("rounded-xl h-12 text-lg", duplicateWarning && "border-destructive")}
              />
              {duplicateWarning && (
                <div className="flex items-center gap-1 text-destructive text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {duplicateWarning}
                </div>
              )}
            </div>
          </div>

          {/* Quick Settings Row */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-card rounded-lg px-2 py-1">
              <span className="text-xs text-muted-foreground">Punkte:</span>
              <Input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                className="w-14 h-6 rounded text-center text-sm p-0 border-0 bg-transparent"
                min={1}
              />
            </div>
            <div className="flex items-center gap-2 bg-card rounded-lg px-2 py-1">
              <span className="text-xs text-muted-foreground">Aktiv:</span>
              <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} />
            </div>
          </div>
        </div>

        {/* Collapsible: Category & Difficulty */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("category")}
            className="w-full flex items-center justify-between p-3 bg-card hover:bg-secondary/50 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">Kategorie & Schwierigkeit</span>
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", expandedSections.includes("category") && "rotate-90")}
            />
          </button>
          <AnimatePresence>
            {expandedSections.includes("category") && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-3 border-t border-border">
                  <div className="grid grid-cols-4 gap-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setFormData({ ...formData, category: cat.key })}
                        className={cn(
                          "flex flex-col items-center p-2 rounded-lg transition-all text-xs",
                          formData.category === cat.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-foreground hover:bg-secondary",
                        )}
                      >
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="mt-0.5">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {DIFFICULTIES.map((diff) => (
                      <button
                        key={diff.key}
                        onClick={() => setFormData({ ...formData, difficulty: diff.key, points: diff.points })}
                        className={cn(
                          "flex items-center justify-center gap-1 p-2 rounded-lg transition-all text-xs",
                          formData.difficulty === diff.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-foreground hover:bg-secondary",
                        )}
                      >
                        <div className={cn("h-2 w-2 rounded-full", diff.color)} />
                        <span>{diff.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapsible: Schedule */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("schedule")}
            className="w-full flex items-center justify-between p-3 bg-card hover:bg-secondary/50 transition-colors"
          >
            <span className="text-sm font-medium text-card-foreground">Wochentage & Zeitfenster</span>
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", expandedSections.includes("schedule") && "rotate-90")}
            />
          </button>
          <AnimatePresence>
            {expandedSections.includes("schedule") && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-3 border-t border-border">
                  <DayPicker
                    selectedDays={formData.days}
                    onDaysChange={(days) => setFormData({ ...formData, days })}
                    size="sm"
                    showLabels
                  />

                  {/* Time Window Toggle */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={!showTimeWindow ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowTimeWindow(false)
                        setFormData({ ...formData, startTime: undefined, endTime: undefined })
                      }}
                      className="flex-1"
                    >
                      <Sun className="h-3 w-3 mr-1" /> Ganztägig
                    </Button>
                    <Button
                      type="button"
                      variant={showTimeWindow ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowTimeWindow(true)
                        if (!formData.startTime) setFormData({ ...formData, startTime: "07:00", endTime: "09:00" })
                      }}
                      className="flex-1"
                    >
                      <Clock className="h-3 w-3 mr-1" /> Zeitfenster
                    </Button>
                  </div>

                  {showTimeWindow && (
                    <div className="grid grid-cols-2 gap-2">
                      <TimePicker
                        value={formData.startTime || "07:00"}
                        onChange={(v) => setFormData({ ...formData, startTime: v })}
                        label="Von"
                      />
                      <TimePicker
                        value={formData.endTime || "09:00"}
                        onChange={(v) => setFormData({ ...formData, endTime: v })}
                        label="Bis"
                      />
                    </div>
                  )}

                  {/* Daily Limit */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Tageslimit:</span>
                    <select
                      value={formData.dailyLimit || 0}
                      onChange={(e) => setFormData({ ...formData, dailyLimit: Number(e.target.value) || undefined })}
                      className="h-7 rounded-lg border border-border bg-background text-xs px-2"
                    >
                      <option value={0}>Unbegrenzt</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}x pro Tag
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Wiederholungs-Intervall */}
                  {formData.dailyLimit && formData.dailyLimit > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Intervall:</span>
                      <select
                        value={formData.repeatInterval || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, repeatInterval: Number(e.target.value) || undefined })
                        }
                        className="h-7 rounded-lg border border-border bg-background text-xs px-2"
                      >
                        <option value={0}>Kein Intervall</option>
                        <option value={30}>30 Min</option>
                        <option value={60}>1 Stunde</option>
                        <option value={90}>1,5 Stunden</option>
                        <option value={120}>2 Stunden</option>
                        <option value={180}>3 Stunden</option>
                        <option value={240}>4 Stunden</option>
                      </select>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapsible: Timer & Notes */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("timer")}
            className="w-full flex items-center justify-between p-3 bg-card hover:bg-secondary/50 transition-colors"
          >
            <span className="text-sm font-medium text-card-foreground">Timer & Notizen</span>
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", expandedSections.includes("timer") && "rotate-90")}
            />
          </button>
          <AnimatePresence>
            {expandedSections.includes("timer") && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-3 border-t border-border">
                  {/* Duration */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Dauer (Min):</span>
                    <Input
                      type="number"
                      value={formData.duration || ""}
                      onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) || undefined })}
                      className="w-16 h-7 rounded-lg text-center text-sm"
                      placeholder="--"
                      min={1}
                    />
                  </div>

                  {/* Timer Options */}
                  {formData.duration && (
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "showMiniTimer", label: "Mini", icon: Clock },
                        { key: "showVisualTimer", label: "Visual", icon: Maximize2 },
                        { key: "showFocusTimer", label: "Fokus", icon: Play },
                      ].map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              timerOptions: {
                                ...formData.timerOptions,
                                [key]: !formData.timerOptions[key as keyof typeof formData.timerOptions],
                              },
                            })
                          }
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all",
                            formData.timerOptions[key as keyof typeof formData.timerOptions]
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border border-border",
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  <textarea
                    value={formData.note || ""}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Notizen / Anweisungen..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs min-h-[60px] resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button onClick={onCancel} variant="outline" className="flex-1 bg-transparent">
            <X className="h-4 w-4 mr-1" /> Abbrechen
          </Button>
          <Button onClick={onSave} disabled={!formData.title.trim() || !!duplicateWarning} className="flex-1">
            <Check className="h-4 w-4 mr-1" /> Speichern
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export function TaskManager() {
  const { state, dispatch } = useFamily()
  const { addTask } = useSupabaseMutations()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData)
  const [showTemplates, setShowTemplates] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<"days" | "toggle" | "delete" | null>(null)
  const [bulkDays, setBulkDays] = useState<string[]>([])

  const tasks = state?.tasks ?? []
  const sortedTasks = [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const checkDuplicate = (title: string, excludeId?: string) => {
    const duplicate = tasks.find((t) => t.title.toLowerCase() === title.toLowerCase() && t.id !== excludeId)
    setDuplicateWarning(duplicate ? `Aufgabe "${duplicate.title}" existiert bereits` : null)
  }

  const handleTitleChange = (title: string) => {
    setFormData({ ...formData, title })
    checkDuplicate(title, editingId || undefined)
  }

  const handleSubmit = () => {
    if (!formData.title.trim() || duplicateWarning) return

    if (editingId) {
      dispatch({
        type: "UPDATE_TASK",
        payload: { id: editingId, updates: formData },
      })
      setEditingId(null)
    } else {
      void addTask({
        title: formData.title,
        description: formData.note,
        note: formData.note,
        points: formData.points,
        category: formData.category,
        difficulty: formData.difficulty,
        emoji: formData.emoji,
        duration: formData.duration,
        days: formData.days,
        isActive: formData.isActive,
        dailyLimit: formData.dailyLimit,
        startTime: formData.startTime,
        endTime: formData.endTime,
        repeatInterval: formData.repeatInterval,
        timerOptions: formData.timerOptions,
      })
      setIsAdding(false)
    }

    setFormData(defaultFormData)
    setDuplicateWarning(null)
  }

  const handleEdit = (task: Task) => {
    setFormData({
      title: task.title,
      emoji: task.emoji,
      category: task.category,
      difficulty: task.difficulty,
      points: task.points,
      duration: task.duration,
      days: task.days,
      isActive: task.isActive,
      note: task.note || "",
      dailyLimit: task.dailyLimit,
      startTime: task.startTime,
      endTime: task.endTime,
      repeatInterval: task.repeatInterval,
      timerOptions: task.timerOptions || {
        showMiniTimer: true,
        showVisualTimer: true,
        showFocusTimer: true,
      },
    })
    setEditingId(task.id)
    setIsAdding(false) // Close new form if open
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData(defaultFormData)
    setDuplicateWarning(null)
  }

  const handleCancelNew = () => {
    setIsAdding(false)
    setShowTemplates(false)
    setFormData(defaultFormData)
    setDuplicateWarning(null)
  }

  const handleDelete = (id: string) => {
    if (confirm("Aufgabe wirklich löschen?")) {
      dispatch({ type: "DELETE_TASK", payload: id })
    }
  }

  const handleMoveTask = (taskId: string, direction: "up" | "down") => {
    const currentIndex = sortedTasks.findIndex((t) => t.id === taskId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= sortedTasks.length) return

    const currentTask = sortedTasks[currentIndex]
    const swapTask = sortedTasks[newIndex]

    dispatch({
      type: "UPDATE_TASK",
      payload: { id: currentTask.id, updates: { order: swapTask.order ?? newIndex } },
    })
    dispatch({
      type: "UPDATE_TASK",
      payload: { id: swapTask.id, updates: { order: currentTask.order ?? currentIndex } },
    })
  }

  const applyTemplate = (template: (typeof TASK_TEMPLATES)[0]) => {
    setFormData({
      ...defaultFormData,
      title: template.title,
      emoji: template.emoji,
      category: template.category,
      difficulty: template.difficulty,
      points: template.points,
      startTime: template.startTime,
      endTime: template.endTime,
    })
    setShowTemplates(false)
    setIsAdding(true)
  }

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
  }

  const selectAllTasks = () => setSelectedTasks(tasks.map((t) => t.id))
  const deselectAllTasks = () => setSelectedTasks([])

  const handleBulkAction = () => {
    if (selectedTasks.length === 0) return

    switch (bulkAction) {
      case "days":
        if (bulkDays.length === 0) return
        selectedTasks.forEach((taskId) => {
          dispatch({
            type: "UPDATE_TASK",
            payload: { id: taskId, updates: { days: bulkDays } },
          })
        })
        break
      case "toggle":
        selectedTasks.forEach((taskId) => {
          const task = tasks.find((t) => t.id === taskId)
          if (task) {
            dispatch({
              type: "UPDATE_TASK",
              payload: { id: taskId, updates: { isActive: !task.isActive } },
            })
          }
        })
        break
      case "delete":
        if (confirm(`Wirklich ${selectedTasks.length} Aufgaben löschen?`)) {
          selectedTasks.forEach((taskId) => {
            dispatch({ type: "DELETE_TASK", payload: taskId })
          })
        } else {
          return
        }
        break
    }

    setShowBulkModal(false)
    setBulkAction(null)
    setSelectedTasks([])
    setSelectionMode(false)
  }

  const formatTimeWindow = (startTime?: string, endTime?: string) => {
    if (!startTime && !endTime) return null
    if (startTime && endTime) return `${startTime} - ${endTime}`
    if (startTime) return `ab ${startTime}`
    if (endTime) return `bis ${endTime}`
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-foreground">Aufgaben ({tasks.length})</h3>
        <div className="flex gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(true)}
                disabled={selectedTasks.length === 0}
              >
                Bearbeiten ({selectedTasks.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectionMode(false)
                  setSelectedTasks([])
                }}
              >
                Abbrechen
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
                <CheckSquare className="h-4 w-4 mr-1" /> Mehrfach
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsAdding(true)
                  setShowTemplates(true)
                  setEditingId(null)
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Neu
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Selection Mode Header */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-secondary rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border border-border"
          >
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={selectAllTasks}
                variant="outline"
                className="rounded-lg text-xs bg-transparent"
              >
                Alle
              </Button>
              <Button
                size="sm"
                onClick={deselectAllTasks}
                variant="outline"
                className="rounded-lg text-xs bg-transparent"
              >
                Keine
              </Button>
              <span className="text-sm font-medium text-foreground">{selectedTasks.length} ausgewählt</span>
            </div>
            {selectedTasks.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => {
                    setBulkAction("days")
                    setShowBulkModal(true)
                  }}
                  variant="outline"
                  className="rounded-lg"
                >
                  Wochentage
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setBulkAction("toggle")
                    setShowBulkModal(true)
                  }}
                  variant="outline"
                  className="rounded-lg"
                >
                  An/Aus
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setBulkAction("delete")
                    setShowBulkModal(true)
                  }}
                  variant="destructive"
                  className="rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates - Only when adding new */}
      <AnimatePresence>
        {showTemplates && isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-secondary/50 rounded-xl space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Vorlagen</span>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TASK_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  onClick={() => applyTemplate(template)}
                  className="flex items-center gap-2 p-2 bg-card rounded-xl hover:bg-secondary transition-all text-left"
                >
                  <span className="text-xl">{template.emoji}</span>
                  <span className="text-xs font-medium truncate text-card-foreground">{template.title}</span>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => {
                setShowTemplates(false)
                setIsAdding(true)
              }}
            >
              Eigene Aufgabe erstellen
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Task Form - At top */}
      <AnimatePresence>
        {isAdding && !showTemplates && !editingId && (
          <InlineTaskForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSubmit}
            onCancel={handleCancelNew}
            duplicateWarning={duplicateWarning}
            onTitleChange={handleTitleChange}
            isNew
          />
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="space-y-2">
        {sortedTasks.map((task, index) => (
          <div key={task.id}>
            {editingId === task.id ? (
              <InlineTaskForm
                formData={formData}
                setFormData={setFormData}
                onSave={handleSubmit}
                onCancel={handleCancelEdit}
                duplicateWarning={duplicateWarning}
                onTitleChange={handleTitleChange}
              />
            ) : (
              <div
                className={cn(
                  "flex items-center gap-3 p-3 bg-card rounded-xl transition-all",
                  !task.isActive && "opacity-50",
                )}
              >
                {/* Selection checkbox */}
                {selectionMode && (
                  <button onClick={() => toggleTaskSelection(task.id)} className="p-1">
                    {selectedTasks.includes(task.id) ? (
                      <CheckSquare className="h-5 w-5 text-primary" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                )}

                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{task.emoji}</span>
                    <span className="font-medium truncate text-card-foreground">{task.title}</span>
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">+{task.points}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {formatTimeWindow(task.startTime, task.endTime) && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeWindow(task.startTime, task.endTime)}
                      </span>
                    )}
                    {task.dailyLimit && <span>{task.dailyLimit}x/Tag</span>}
                  </div>
                </div>

                {/* Actions */}
                {!selectionMode && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveTask(task.id, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveTask(task.id, "down")}
                      disabled={index === sortedTasks.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(task)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Noch keine Aufgaben erstellt</p>
          <Button
            variant="outline"
            className="mt-2 bg-transparent"
            onClick={() => {
              setIsAdding(true)
              setShowTemplates(true)
            }}
          >
            Erste Aufgabe erstellen
          </Button>
        </div>
      )}

      {/* Bulk Action Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card rounded-2xl p-4 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-lg text-foreground">
                {bulkAction === "days" && "Wochentage ändern"}
                {bulkAction === "toggle" && "Aktivierung umschalten"}
                {bulkAction === "delete" && "Aufgaben löschen"}
              </h3>

              {bulkAction === "days" && (
                <DayPicker selectedDays={bulkDays} onDaysChange={setBulkDays} size="md" showLabels />
              )}

              {bulkAction === "toggle" && (
                <p className="text-sm text-muted-foreground">
                  {selectedTasks.length} Aufgaben werden umgeschaltet (aktiv/inaktiv).
                </p>
              )}

              {bulkAction === "delete" && (
                <p className="text-sm text-destructive">
                  {selectedTasks.length} Aufgaben werden unwiderruflich gelöscht!
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowBulkModal(false)}>
                  Abbrechen
                </Button>
                <Button
                  className="flex-1"
                  variant={bulkAction === "delete" ? "destructive" : "default"}
                  onClick={handleBulkAction}
                >
                  Bestätigen
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
