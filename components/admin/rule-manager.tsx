"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trash2,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  ChevronUp,
  ChevronDown,
  Star,
  Plus,
  ChevronRight,
  Pencil,
} from "lucide-react"
import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import { Button } from "@/components/ui/button"
import { DEFAULT_RULES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Rule, RuleCategory } from "@/types"

const CATEGORIES: { id: RuleCategory; label: string }[] = [
  { id: "behavior", label: "Verhalten" },
  { id: "social", label: "Soziales" },
  { id: "chores", label: "Haushalt" },
  { id: "homework", label: "Schule" },
]

const RULE_EMOJIS = ["💝", "🤝", "👂", "🌟", "📝", "😤", "🙉", "😠", "📕", "🎯", "💪", "🧠", "🤗", "👋", "🎨"]

interface RuleFormData {
  title: string
  emoji: string
  isPositive: boolean
  category: RuleCategory
  points: number
  dailyLimit?: number
  repeatInterval?: number
  isActive: boolean
}

const defaultFormData: RuleFormData = {
  title: "",
  emoji: "💝",
  isPositive: true,
  category: "behavior",
  points: 10,
  dailyLimit: undefined,
  repeatInterval: undefined,
  isActive: true,
}

function InlineRuleForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  editingId,
  favoriteRuleIds,
  onToggleFavorite,
}: {
  formData: RuleFormData
  setFormData: (data: RuleFormData) => void
  onSave: () => void
  onCancel: () => void
  editingId: string | null
  favoriteRuleIds: string[]
  onToggleFavorite: (id: string) => void
}) {
  const [expandedSections, setExpandedSections] = useState<string[]>(["basic"])
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
        {/* Type Toggle - Always visible */}
        <div className="flex gap-2">
          <button
            onClick={() => setFormData({ ...formData, isPositive: true })}
            className={cn(
              "flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm",
              formData.isPositive ? "bg-green-500 text-white" : "bg-card text-muted-foreground",
            )}
          >
            <ThumbsUp className="w-4 h-4" />
            Positiv
          </button>
          <button
            onClick={() => setFormData({ ...formData, isPositive: false })}
            className={cn(
              "flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm",
              !formData.isPositive ? "bg-red-500 text-white" : "bg-card text-muted-foreground",
            )}
          >
            <ThumbsDown className="w-4 h-4" />
            Negativ
          </button>
        </div>

        {/* Title & Emoji Row */}
        <div className="flex gap-3 items-start">
          <div className="flex flex-wrap gap-1 max-w-[120px]">
            {RULE_EMOJIS.slice(0, 6).map((emoji) => (
              <button
                key={emoji}
                onClick={() => setFormData({ ...formData, emoji })}
                className={cn(
                  "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                  formData.emoji === emoji
                    ? "bg-primary ring-2 ring-primary ring-offset-1"
                    : "bg-card hover:bg-secondary",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              placeholder="Regelname..."
            />
            {/* Quick points */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Punkte:</span>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: Math.abs(Number(e.target.value)) })}
                className="w-16 h-7 rounded-lg border border-border bg-background text-center text-sm"
                min={1}
              />
            </div>
          </div>
        </div>

        {/* Collapsible: More Emojis */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("emojis")}
            className="w-full flex items-center justify-between p-2 bg-card hover:bg-secondary/50 transition-colors"
          >
            <span className="text-xs font-medium">Mehr Emojis</span>
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", expandedSections.includes("emojis") && "rotate-90")}
            />
          </button>
          <AnimatePresence>
            {expandedSections.includes("emojis") && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-2 flex flex-wrap gap-1 border-t border-border">
                  {RULE_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={cn(
                        "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                        formData.emoji === emoji
                          ? "bg-primary ring-2 ring-primary ring-offset-1"
                          : "bg-background hover:bg-secondary",
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapsible: Category & Limit */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("options")}
            className="w-full flex items-center justify-between p-2 bg-card hover:bg-secondary/50 transition-colors"
          >
            <span className="text-xs font-medium">Kategorie & Limit</span>
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", expandedSections.includes("options") && "rotate-90")}
            />
          </button>
          <AnimatePresence>
            {expandedSections.includes("options") && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-2 space-y-2 border-t border-border">
                  <div className="grid grid-cols-2 gap-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setFormData({ ...formData, category: cat.id })}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-xs transition-all",
                          formData.category === cat.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-secondary",
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
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
                  {(formData.dailyLimit ?? 0) > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Wiederholungs-Intervall:</span>
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
                        <option value={90}>1.5 Stunden</option>
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

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button onClick={onCancel} variant="outline" size="sm" className="flex-1 bg-transparent">
            <X className="h-4 w-4 mr-1" /> Abbrechen
          </Button>
          {editingId && (
            <Button
              onClick={() => onToggleFavorite(editingId)}
              variant={favoriteRuleIds.includes(editingId) ? "default" : "outline"}
              size="sm"
              className="bg-transparent"
            >
              <Star className={cn("h-4 w-4", favoriteRuleIds.includes(editingId) && "fill-current")} />
            </Button>
          )}
          <Button onClick={onSave} disabled={!formData.title.trim() || !formData.emoji} size="sm" className="flex-1">
            <Check className="h-4 w-4 mr-1" /> Speichern
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export function RuleManager() {
  const { state, dispatch } = useFamily()
  const { addRule } = useSupabaseMutations()
  const [filter, setFilter] = useState<"all" | "positive" | "negative">("all")
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData)

  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<"toggle" | "delete" | null>(null)

  const rules = state?.rules ?? []
  const favoriteRuleIds = state?.settings?.favoriteRuleIds ?? []

  const sortedRules = [...rules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const filteredRules = sortedRules.filter((r) => {
    if (filter === "positive") return r.isPositive
    if (filter === "negative") return !r.isPositive
    return true
  })

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.emoji) return

    const points = formData.isPositive ? Math.abs(formData.points) : -Math.abs(formData.points)

    if (editingId) {
      dispatch({
        type: "UPDATE_RULE",
        payload: {
          id: editingId,
          updates: { ...formData, points },
        },
      })
      setEditingId(null)
    } else {
      void addRule({ ...formData, points })
      setIsAdding(false)
    }

    setFormData(defaultFormData)
  }

  const handleEdit = (rule: Rule) => {
    setFormData({
      title: rule.title,
      emoji: rule.emoji,
      isPositive: rule.isPositive,
      category: rule.category,
      points: Math.abs(rule.points),
      dailyLimit: rule.dailyLimit,
      repeatInterval: rule.repeatInterval,
      isActive: rule.isActive,
    })
    setEditingId(rule.id)
    setIsAdding(false)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData(defaultFormData)
  }

  const handleCancelNew = () => {
    setIsAdding(false)
    setFormData(defaultFormData)
  }

  const handleDelete = (ruleId: string) => {
    if (confirm("Diese Regel wirklich loeschen?")) {
      dispatch({ type: "DELETE_RULE", payload: ruleId })
    }
  }

  const handleMoveRule = (ruleId: string, direction: "up" | "down") => {
    const currentIndex = filteredRules.findIndex((r) => r.id === ruleId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= filteredRules.length) return

    const currentRule = filteredRules[currentIndex]
    const swapRule = filteredRules[newIndex]

    dispatch({
      type: "UPDATE_RULE",
      payload: { id: currentRule.id, updates: { order: swapRule.order ?? newIndex } },
    })
    dispatch({
      type: "UPDATE_RULE",
      payload: { id: swapRule.id, updates: { order: currentRule.order ?? currentIndex } },
    })
  }

  const loadDefaults = () => {
    if (!confirm("Standard-Regeln laden? Bestehende bleiben erhalten.")) return
    DEFAULT_RULES.forEach((rule) => {
      void addRule(rule)
    })
  }

  const toggleFavorite = (ruleId: string) => {
    const isFavorite = favoriteRuleIds.includes(ruleId)
    const newFavorites = isFavorite
      ? favoriteRuleIds.filter((id) => id !== ruleId)
      : favoriteRuleIds.length < 8
        ? [...favoriteRuleIds, ruleId]
        : favoriteRuleIds

    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { favoriteRuleIds: newFavorites },
    })
  }

  const toggleRuleSelection = (ruleId: string) => {
    setSelectedRules((prev) => (prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId]))
  }

  const selectAllRules = () => setSelectedRules(filteredRules.map((r) => r.id))
  const deselectAllRules = () => setSelectedRules([])

  const handleBulkAction = () => {
    if (selectedRules.length === 0) return

    switch (bulkAction) {
      case "toggle":
        selectedRules.forEach((ruleId) => {
          const rule = rules.find((r) => r.id === ruleId)
          if (rule) {
            dispatch({
              type: "UPDATE_RULE",
              payload: { id: ruleId, updates: { isActive: !rule.isActive } },
            })
          }
        })
        break
      case "delete":
        if (confirm(`Wirklich ${selectedRules.length} Regeln loeschen?`)) {
          selectedRules.forEach((ruleId) => {
            dispatch({ type: "DELETE_RULE", payload: ruleId })
          })
        } else {
          return
        }
        break
    }

    setShowBulkModal(false)
    setBulkAction(null)
    setSelectedRules([])
    setSelectionMode(false)
  }

  return (
    <div className="space-y-4">
      {/* Favorites Info */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1 text-sm">Favoriten-Regeln</h4>
            <p className="text-xs text-muted-foreground mb-2">4-8 Regeln als Schnellzugriff auf der Startseite</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${(favoriteRuleIds.length / 8) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-foreground whitespace-nowrap">{favoriteRuleIds.length}/8</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Regeln ({rules.length})</h3>
        <div className="flex gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(true)}
                disabled={selectedRules.length === 0}
              >
                Bearbeiten ({selectedRules.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectionMode(false)
                  setSelectedRules([])
                }}
              >
                Abbrechen
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
                <Check className="h-4 w-4 mr-1" /> Mehrfach
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsAdding(true)
                  setEditingId(null)
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Neu
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: "all", label: "Alle" },
          { id: "positive", label: "Positiv", icon: ThumbsUp },
          { id: "negative", label: "Negativ", icon: ThumbsDown },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1",
              filter === f.id
                ? f.id === "positive"
                  ? "bg-green-500 text-white"
                  : f.id === "negative"
                    ? "bg-red-500 text-white"
                    : "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.icon && <f.icon className="w-4 h-4" />}
            {f.label}
          </button>
        ))}
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
                onClick={selectAllRules}
                variant="outline"
                className="rounded-lg text-xs bg-transparent"
              >
                Alle
              </Button>
              <Button
                size="sm"
                onClick={deselectAllRules}
                variant="outline"
                className="rounded-lg text-xs bg-transparent"
              >
                Keine
              </Button>
              <span className="text-sm font-medium text-foreground">{selectedRules.length} ausgewaehlt</span>
            </div>
            {selectedRules.length > 0 && (
              <div className="flex gap-2">
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

      {/* Load Defaults Button */}
      {rules.length === 0 && (
        <Button onClick={loadDefaults} variant="outline" className="w-full bg-transparent">
          Vorlagen laden
        </Button>
      )}

      {/* New Rule Form - At top */}
      <AnimatePresence>
        {isAdding && !editingId && (
          <InlineRuleForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSubmit}
            onCancel={handleCancelNew}
            editingId={null}
            favoriteRuleIds={favoriteRuleIds}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </AnimatePresence>

      {/* Rule List */}
      <div className="space-y-2">
        {filteredRules.map((rule, index) => (
          <div key={rule.id}>
            {editingId === rule.id ? (
              <InlineRuleForm
                formData={formData}
                setFormData={setFormData}
                onSave={handleSubmit}
                onCancel={handleCancelEdit}
                editingId={editingId}
                favoriteRuleIds={favoriteRuleIds}
                onToggleFavorite={toggleFavorite}
              />
            ) : (
              <div
                className={cn(
                  "bg-card rounded-xl p-3 flex items-center gap-3 transition-all",
                  rule.isPositive ? "border-l-4 border-green-500" : "border-l-4 border-red-500",
                  !rule.isActive && "opacity-50",
                  selectedRules.includes(rule.id) && "ring-2 ring-primary",
                )}
              >
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule.id)}
                    onChange={() => toggleRuleSelection(rule.id)}
                    className="w-5 h-5 rounded border-2 border-primary text-primary focus:ring-primary"
                  />
                )}

                {/* Move arrows */}
                {!selectionMode && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveRule(rule.id, "up")}
                      disabled={index === 0}
                      className={cn(
                        "p-0.5 rounded hover:bg-secondary transition-colors",
                        index === 0 && "opacity-30 cursor-not-allowed",
                      )}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveRule(rule.id, "down")}
                      disabled={index === filteredRules.length - 1}
                      className={cn(
                        "p-0.5 rounded hover:bg-secondary transition-colors",
                        index === filteredRules.length - 1 && "opacity-30 cursor-not-allowed",
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Rule Info */}
                <span className="text-2xl">{rule.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{rule.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className={rule.isPositive ? "text-green-500" : "text-red-500"}>
                      {rule.points > 0 ? "+" : ""}
                      {rule.points} Pkt
                    </span>
                    <span>{CATEGORIES.find((c) => c.id === rule.category)?.label}</span>
                    {rule.dailyLimit && <span className="text-orange-500">Max. {rule.dailyLimit}x/Tag</span>}
                    {rule.repeatInterval && (
                      <span className="text-orange-500">Wiederholung alle {rule.repeatInterval} Min</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!selectionMode && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFavorite(rule.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        favoriteRuleIds.includes(rule.id)
                          ? "bg-amber-500/20 text-amber-500"
                          : "hover:bg-secondary text-muted-foreground",
                      )}
                    >
                      <Star className={cn("h-4 w-4", favoriteRuleIds.includes(rule.id) && "fill-current")} />
                    </button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(rule)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(rule.id)}
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

      {filteredRules.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Keine Regeln gefunden</p>
          <Button variant="outline" className="mt-2 bg-transparent" onClick={() => setIsAdding(true)}>
            Erste Regel erstellen
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
                {bulkAction === "toggle" && "Aktivierung umschalten"}
                {bulkAction === "delete" && "Regeln loeschen"}
              </h3>

              {bulkAction === "toggle" && (
                <p className="text-sm text-muted-foreground">
                  {selectedRules.length} Regeln werden umgeschaltet (aktiv/inaktiv).
                </p>
              )}

              {bulkAction === "delete" && (
                <p className="text-sm text-destructive">
                  {selectedRules.length} Regeln werden unwiderruflich geloescht!
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
                  Bestaetigen
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
