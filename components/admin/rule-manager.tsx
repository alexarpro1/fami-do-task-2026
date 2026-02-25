"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, Check, X, ThumbsUp, ThumbsDown, Star, Plus, ChevronRight, Pencil } from "lucide-react"
import { useFamily } from "@/context/family-context"
import { useRules } from "@/hooks/useRules"
import type { RuleProfile } from "@/hooks/useRules"
import { Button } from "@/components/ui/button"
import { DEFAULT_RULES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Rule } from "@/types"

const RULE_EMOJIS = ["💝", "🤝", "👂", "🌟", "📝", "😤", "🙉", "😠", "📕", "🎯", "💪", "🧠", "🤗", "👋", "🎨"]

interface RuleFormData {
  title: string
  emoji: string
  point_impact: number
  is_active: boolean
}

const defaultFormData: RuleFormData = {
  title: "",
  emoji: "💝",
  point_impact: 10,
  is_active: true,
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
  const [expandedEmojis, setExpandedEmojis] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (formRef.current) {
      const rect = formRef.current.getBoundingClientRect()
      if (rect.bottom > window.innerHeight || rect.top < 0) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [])

  return (
    <motion.div
      ref={formRef}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-secondary/50 rounded-xl overflow-hidden"
    >
      <div className="p-4 space-y-3">
        <div className="flex gap-3 items-start">
          <div className="flex flex-wrap gap-1 max-w-[120px]">
            {RULE_EMOJIS.slice(0, 6).map((emoji) => (
              <button
                key={emoji}
                onClick={() => setFormData({ ...formData, emoji })}
                className={cn(
                  "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                  formData.emoji === emoji ? "bg-primary ring-2 ring-primary ring-offset-1" : "bg-card hover:bg-secondary",
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
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Punkte:</span>
              <input
                type="number"
                value={formData.point_impact}
                onChange={(e) => setFormData({ ...formData, point_impact: Number(e.target.value) })}
                className="w-20 h-7 rounded-lg border border-border bg-background text-center text-sm"
              />
              <span className="text-xs text-muted-foreground">(negativ = Strafe)</span>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedEmojis((b) => !b)}
            className="w-full flex items-center justify-between p-2 bg-card hover:bg-secondary/50 transition-colors"
          >
            <span className="text-xs font-medium">Mehr Emojis</span>
            <ChevronRight className={cn("h-4 w-4 transition-transform", expandedEmojis && "rotate-90")} />
          </button>
          {expandedEmojis && (
            <div className="p-2 flex flex-wrap gap-1 border-t border-border">
              {RULE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setFormData({ ...formData, emoji })}
                  className={cn(
                    "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                    formData.emoji === emoji ? "bg-primary ring-2 ring-primary ring-offset-1" : "bg-background hover:bg-secondary",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

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
  const { rules, addRule, updateRule, deleteRule } = useRules()
  const [filter, setFilter] = useState<"all" | "positive" | "negative">("all")
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData)

  const favoriteRuleIds = state?.settings?.favoriteRuleIds ?? []

  const filteredRules = rules.filter((r) => {
    if (filter === "positive") return r.point_impact >= 0
    if (filter === "negative") return r.point_impact < 0
    return true
  })

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.emoji) return

    if (editingId) {
      await updateRule(editingId, {
        title: formData.title,
        point_impact: formData.point_impact,
        emoji: formData.emoji,
        is_active: formData.is_active ? 1 : 0,
      })
      setEditingId(null)
    } else {
      await addRule({
        title: formData.title,
        point_impact: formData.point_impact,
        emoji: formData.emoji,
      })
      setIsAdding(false)
    }
    setFormData(defaultFormData)
  }

  const handleEdit = (rule: RuleProfile) => {
    setFormData({
      title: rule.title,
      emoji: rule.emoji,
      point_impact: rule.point_impact,
      is_active: rule.is_active === 1,
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

  const handleDelete = async (ruleId: string) => {
    if (confirm("Diese Regel wirklich loeschen?")) await deleteRule(ruleId)
  }

  const loadDefaults = async () => {
    if (!confirm("Standard-Regeln laden? Bestehende bleiben erhalten.")) return
    for (const r of DEFAULT_RULES as Rule[]) {
      await addRule({
        title: r.title,
        point_impact: r.points,
        emoji: r.emoji,
      })
    }
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

  return (
    <div className="space-y-4">
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

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Regeln ({rules.length})</h3>
        <Button size="sm" onClick={() => { setIsAdding(true); setEditingId(null) }}>
          <Plus className="h-4 w-4 mr-1" /> Neu
        </Button>
      </div>

      <div className="flex gap-2">
        {[
          { id: "all" as const, label: "Alle" },
          { id: "positive" as const, label: "Positiv", icon: ThumbsUp },
          { id: "negative" as const, label: "Negativ", icon: ThumbsDown },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
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

      {rules.length === 0 && (
        <Button onClick={loadDefaults} variant="outline" className="w-full bg-transparent">
          Vorlagen laden
        </Button>
      )}

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

      <div className="space-y-2">
        {filteredRules.map((rule) => (
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
                  rule.point_impact >= 0 ? "border-l-4 border-green-500" : "border-l-4 border-red-500",
                  rule.is_active === 0 && "opacity-50",
                )}
              >
                <span className="text-2xl">{rule.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{rule.title}</p>
                  <span className={rule.point_impact >= 0 ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
                    {rule.point_impact >= 0 ? "+" : ""}
                    {rule.point_impact} Pkt
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleFavorite(rule.id)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      favoriteRuleIds.includes(rule.id) ? "bg-amber-500/20 text-amber-500" : "hover:bg-secondary text-muted-foreground",
                    )}
                  >
                    <Star className={cn("h-4 w-4", favoriteRuleIds.includes(rule.id) && "fill-current")} />
                  </button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(rule)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
    </div>
  )
}
