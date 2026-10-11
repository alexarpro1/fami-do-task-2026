"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Check, X, Coins, ChevronUp, ChevronDown, ShoppingBag, Pencil } from "lucide-react"
import { useFamily } from "@/context/family-context"
import { useSupabaseMutations } from "@/hooks/useSupabaseMutations"
import { triggerSuccess } from "@/lib/haptics"
import { Button } from "@/components/ui/button"
import { DEFAULT_REWARDS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Reward, RewardCategory } from "@/types"

const CATEGORIES: { id: RewardCategory; label: string }[] = [
  { id: "item", label: "Artikel" },
  { id: "privilege", label: "Privileg" },
  { id: "experience", label: "Erlebnis" },
]

const REWARD_EMOJIS = ["📱", "🍬", "🎬", "🎢", "🎁", "🏠", "🍕", "🌙", "🎮", "🍦", "🎪", "🎨", "🚲", "📚", "🧸"]

function InlineRewardForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  isEditing,
}: {
  formData: Partial<Reward>
  setFormData: (data: Partial<Reward>) => void
  onSave: () => void
  onCancel: () => void
  isEditing: boolean
}) {
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [])

  return (
    <motion.div
      ref={formRef}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-secondary/30 rounded-xl p-4 space-y-3 border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              placeholder="z.B. Extra Bildschirmzeit"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Kosten</label>
            <input
              type="number"
              value={formData.cost || 0}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              min={0}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Emoji</label>
          <div className="flex flex-wrap gap-1.5">
            {REWARD_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setFormData({ ...formData, emoji })}
                className={cn(
                  "w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all",
                  formData.emoji === emoji
                    ? "bg-primary ring-2 ring-primary ring-offset-1"
                    : "bg-secondary hover:bg-secondary/80",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Kategorie</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as RewardCategory })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tageslimit</label>
            <input
              type="number"
              value={formData.dailyLimit || ""}
              onChange={(e) => setFormData({ ...formData, dailyLimit: Number(e.target.value) || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              placeholder="0 = unbegrenzt"
              min={0}
            />
          </div>
        </div>

        {(formData.dailyLimit ?? 0) > 1 && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Wiederholungs-Intervall</label>
            <select
              value={formData.repeatInterval || 0}
              onChange={(e) => setFormData({ ...formData, repeatInterval: Number(e.target.value) || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value={0}>Kein Intervall</option>
              <option value={30}>30 Minuten</option>
              <option value={60}>1 Stunde</option>
              <option value={90}>1.5 Stunden</option>
              <option value={120}>2 Stunden</option>
              <option value={180}>3 Stunden</option>
              <option value={240}>4 Stunden</option>
            </select>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={onSave} size="sm" className="flex-1 rounded-lg" disabled={!formData.name || !formData.emoji}>
            <Check className="w-4 h-4 mr-1" />
            {isEditing ? "Speichern" : "Hinzufügen"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-lg">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export function RewardManager() {
  const { state, dispatch } = useFamily()
  const { addReward } = useSupabaseMutations()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingReward, setEditingReward] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Reward>>({
    category: "item",
    cost: 50,
    isActive: true,
  })

  const rewards = state?.rewards ?? []
  const sortedRewards = [...rewards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const resetForm = () => {
    setFormData({ category: "item", cost: 50, isActive: true })
    setEditingReward(null)
    setShowAddForm(false)
  }

  const handleSave = () => {
    if (!formData.name || !formData.emoji) return

    if (editingReward) {
      dispatch({
        type: "UPDATE_REWARD",
        payload: {
          id: editingReward,
          updates: {
            name: formData.name,
            emoji: formData.emoji,
            cost: formData.cost,
            category: formData.category,
            description: formData.description,
            isActive: formData.isActive,
            dailyLimit: formData.dailyLimit,
            repeatInterval: formData.repeatInterval,
          },
        },
      })
    } else {
      void addReward({
        name: formData.name!,
        emoji: formData.emoji!,
        cost: formData.cost || 50,
        category: formData.category || "item",
        description: formData.description,
        isActive: true,
        dailyLimit: formData.dailyLimit,
        repeatInterval: formData.repeatInterval,
      })
      void triggerSuccess()
    }
    resetForm()
  }

  const handleEdit = (reward: Reward) => {
    setFormData({ ...reward })
    setEditingReward(reward.id)
    setShowAddForm(false)
  }

  const handleDelete = (rewardId: string) => {
    if (confirm("Diese Belohnung wirklich löschen?")) {
      dispatch({ type: "DELETE_REWARD", payload: rewardId })
    }
  }

  const handleMoveReward = (rewardId: string, direction: "up" | "down") => {
    const currentIndex = sortedRewards.findIndex((r) => r.id === rewardId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= sortedRewards.length) return

    const reorderedRewards = [...sortedRewards]
    const [movedReward] = reorderedRewards.splice(currentIndex, 1)
    reorderedRewards.splice(newIndex, 0, movedReward)

    reorderedRewards.forEach((reward, index) => {
      dispatch({
        type: "UPDATE_REWARD",
        payload: { id: reward.id, updates: { order: index } },
      })
    })
  }

  const loadDefaults = () => {
    if (!confirm("Standard-Belohnungen laden? Bestehende bleiben erhalten.")) return
    DEFAULT_REWARDS.forEach((reward) => {
      void addReward(reward)
    })
    void triggerSuccess()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingReward(null)
          }}
          variant={showAddForm ? "secondary" : "default"}
          className="flex-1 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neue Belohnung
        </Button>
        <Button onClick={loadDefaults} variant="outline" className="rounded-xl bg-transparent">
          Vorlagen
        </Button>
      </div>

      <AnimatePresence>
        {showAddForm && !editingReward && (
          <InlineRewardForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
            onCancel={resetForm}
            isEditing={false}
          />
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {sortedRewards.map((reward, index) => (
          <div key={reward.id}>
            {editingReward === reward.id ? (
              <InlineRewardForm
                formData={formData}
                setFormData={setFormData}
                onSave={handleSave}
                onCancel={resetForm}
                isEditing={true}
              />
            ) : (
              <motion.div
                layout
                className={cn(
                  "bg-card rounded-xl p-3 neu-flat flex items-center gap-3",
                  !reward.isActive && "opacity-50",
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveReward(reward.id, "up")}
                    disabled={index === 0}
                    className={cn(
                      "p-0.5 rounded hover:bg-secondary transition-colors",
                      index === 0 && "opacity-30 cursor-not-allowed",
                    )}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMoveReward(reward.id, "down")}
                    disabled={index === sortedRewards.length - 1}
                    className={cn(
                      "p-0.5 rounded hover:bg-secondary transition-colors",
                      index === sortedRewards.length - 1 && "opacity-30 cursor-not-allowed",
                    )}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <span className="text-2xl">{reward.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{reward.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Coins className="w-3 h-3" />
                      {reward.cost}
                    </span>
                    <span>{CATEGORIES.find((c) => c.id === reward.category)?.label}</span>
                    {reward.dailyLimit && <span className="text-orange-500">Max. {reward.dailyLimit}x/Tag</span>}
                    {(reward.purchaseCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-green-500">
                        <ShoppingBag className="w-3 h-3" />
                        {reward.purchaseCount}x
                      </span>
                    )}
                    {reward.repeatInterval && (
                      <span className="flex items-center gap-1 text-blue-500">
                        Wiederholt alle {reward.repeatInterval} Minuten
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(reward)} className="rounded-full">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(reward.id)}
                    className="rounded-full text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        ))}

        {rewards.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">Keine Belohnungen vorhanden</div>
        )}
      </div>
    </div>
  )
}
