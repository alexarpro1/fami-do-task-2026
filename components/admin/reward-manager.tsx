"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Check, X, Coins, Pencil } from "lucide-react"
import { useRewards, type RewardProfile } from "@/hooks/useRewards"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const REWARD_EMOJIS = ["📱", "🍬", "🎬", "🎢", "🎁", "🏠", "🍕", "🌙", "🎮", "🍦", "🎪", "🎨", "🚲", "📚", "🧸"]

interface RewardFormData {
  title: string
  cost: number
  emoji: string
}

function InlineRewardForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  isEditing,
}: {
  formData: RewardFormData
  setFormData: (data: RewardFormData) => void
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
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              placeholder="z.B. Extra Bildschirmzeit"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Kosten (Punkte)</label>
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
                type="button"
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

        <div className="flex gap-2 pt-2">
          <Button onClick={onSave} size="sm" className="flex-1 rounded-lg" disabled={!formData.title.trim() || !formData.emoji}>
            <Check className="w-4 h-4 mr-1" />
            {isEditing ? "Speichern" : "Hinzufuegen"}
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
  const { rewards, addReward, updateReward, deleteReward } = useRewards()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingReward, setEditingReward] = useState<string | null>(null)
  const [formData, setFormData] = useState<RewardFormData>({
    title: "",
    cost: 50,
    emoji: "🎁",
  })

  const resetForm = () => {
    setFormData({ title: "", cost: 50, emoji: "🎁" })
    setEditingReward(null)
    setShowAddForm(false)
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.emoji) return

    if (editingReward) {
      await updateReward(editingReward, {
        title: formData.title.trim(),
        cost: formData.cost,
        emoji: formData.emoji,
      })
    } else {
      await addReward({
        title: formData.title.trim(),
        cost: formData.cost,
        emoji: formData.emoji,
      })
    }
    resetForm()
  }

  const handleEdit = (reward: RewardProfile) => {
    setFormData({ title: reward.title, cost: reward.cost, emoji: reward.emoji })
    setEditingReward(reward.id)
    setShowAddForm(false)
  }

  const handleDelete = (rewardId: string) => {
    if (confirm("Diese Belohnung deaktivieren? (Soft-Delete, bleibt in der Cloud.)")) {
      deleteReward(rewardId).catch(() => {})
    }
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() => {
          setShowAddForm(!showAddForm)
          setEditingReward(null)
        }}
        variant={showAddForm ? "secondary" : "default"}
        className="w-full rounded-xl"
      >
        <Plus className="w-4 h-4 mr-2" />
        Neue Belohnung
      </Button>

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
        {rewards.map((reward) => (
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
                  reward.is_active === 0 && "opacity-50",
                )}
              >
                <span className="text-2xl">{reward.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{reward.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Coins className="w-3 h-3" />
                      {reward.cost} Punkte
                    </span>
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
