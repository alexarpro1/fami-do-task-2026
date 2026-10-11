"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Edit, Check, X, RotateCcw, ChevronUp, ChevronDown, Coins, Minus } from "lucide-react"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { ChildAvatar } from "@/components/child/child-avatar"
import { AddChildForm } from "@/components/child/add-child-form"
import { AVATARS, CHILD_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Child } from "@/types"

export function ChildManager() {
  const { state, dispatch } = useFamily()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingChild, setEditingChild] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Child>>({})
  const [adjustingPointsChild, setAdjustingPointsChild] = useState<Child | null>(null)
  const [pointsAmount, setPointsAmount] = useState<number>(0)
  const [pointsReason, setPointsReason] = useState<string>("")

  const scrollPositionRef = useRef<number>(0)
  const isRestoringScrollRef = useRef<boolean>(false)

  const children = state?.children ?? []

  useEffect(() => {
    if (isRestoringScrollRef.current && editingChild) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current)
        isRestoringScrollRef.current = false
      })
    }
  }, [editingChild])

  const handleEdit = (child: Child) => {
    scrollPositionRef.current = window.scrollY
    isRestoringScrollRef.current = true

    setEditingChild(child.id)
    setEditForm({ ...child })
  }

  const handleSaveEdit = () => {
    if (editingChild && editForm.name) {
      dispatch({
        type: "UPDATE_CHILD",
        payload: {
          id: editingChild,
          updates: {
            name: editForm.name,
            age: editForm.age,
            avatar: editForm.avatar,
            color: editForm.color,
          },
        },
      })
      setEditingChild(null)
      setEditForm({})

      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current)
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingChild(null)
    setEditForm({})

    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current)
    })
  }

  const handleDelete = (childId: string) => {
    if (confirm("Dieses Kind wirklich löschen? Alle Punkte gehen verloren.")) {
      dispatch({ type: "DELETE_CHILD", payload: childId })
    }
  }

  const handleResetPoints = (childId: string) => {
    if (confirm("Alle Punkte dieses Kindes zurücksetzen?")) {
      dispatch({
        type: "UPDATE_CHILD",
        payload: {
          id: childId,
          updates: { points: 0, totalPointsEarned: 0 },
        },
      })
    }
  }

  const handleMoveChild = (childId: string, direction: "up" | "down") => {
    const currentIndex = children.findIndex((c) => c.id === childId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= children.length) return

    const currentChild = children[currentIndex]
    const swapChild = children[newIndex]

    const tempDate = currentChild.createdAt
    dispatch({
      type: "UPDATE_CHILD",
      payload: { id: currentChild.id, updates: { createdAt: swapChild.createdAt } },
    })
    dispatch({
      type: "UPDATE_CHILD",
      payload: { id: swapChild.id, updates: { createdAt: tempDate } },
    })
  }

  const handleOpenPointsAdjust = (child: Child) => {
    setAdjustingPointsChild(child)
    setPointsAmount(0)
    setPointsReason("")
  }

  const handleAdjustPoints = () => {
    if (adjustingPointsChild && pointsAmount !== 0) {
      dispatch({
        type: "ADJUST_POINTS",
        payload: {
          childId: adjustingPointsChild.id,
          amount: pointsAmount,
          reason: pointsReason || (pointsAmount > 0 ? "Punkte hinzugefuegt" : "Punkte abgezogen"),
        },
      })
      setAdjustingPointsChild(null)
      setPointsAmount(0)
      setPointsReason("")
    }
  }

  const quickAdjustPresets = [1, 5, 10, 25, 50]

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <Button
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full rounded-xl"
        variant={showAddForm ? "secondary" : "default"}
      >
        <Plus className="w-4 h-4 mr-2" />
        Kind hinzufügen
      </Button>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-2xl p-4 neu-flat">
              <AddChildForm onSuccess={() => setShowAddForm(false)} onCancel={() => setShowAddForm(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Children List */}
      <div className="space-y-3">
        {children.map((child, index) => (
          <motion.div key={child.id} layout className="bg-card rounded-xl p-4 neu-flat">
            {editingChild === child.id ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    placeholder="Name"
                  />
                  <input
                    type="number"
                    value={editForm.age || ""}
                    onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) })}
                    className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    placeholder="Alter"
                  />
                </div>

                {/* Avatar Selection */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Avatar</p>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.slice(0, 8).map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setEditForm({ ...editForm, avatar })}
                        className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-all
                          ${
                            editForm.avatar === avatar
                              ? "bg-primary ring-2 ring-primary ring-offset-2"
                              : "bg-secondary hover:bg-secondary/80"
                          }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Farbe</p>
                  <div className="flex flex-wrap gap-2">
                    {CHILD_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setEditForm({ ...editForm, color: color.value })}
                        className={`w-8 h-8 rounded-full transition-all
                          ${editForm.color === color.value ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} className="flex-1 rounded-xl">
                    <Check className="w-4 h-4 mr-2" />
                    Speichern
                  </Button>
                  <Button variant="ghost" onClick={handleCancelEdit} className="rounded-xl">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveChild(child.id, "up")}
                      disabled={index === 0}
                      className={cn(
                        "p-0.5 rounded hover:bg-secondary transition-colors",
                        index === 0 && "opacity-30 cursor-not-allowed",
                      )}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveChild(child.id, "down")}
                      disabled={index === children.length - 1}
                      className={cn(
                        "p-0.5 rounded hover:bg-secondary transition-colors",
                        index === children.length - 1 && "opacity-30 cursor-not-allowed",
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <ChildAvatar avatar={child.avatar} color={child.color} size="md" />
                  <div>
                    <p className="font-semibold text-foreground">{child.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {child.age ? `${child.age} Jahre` : "Alter nicht angegeben"} | {child.points} Punkte
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenPointsAdjust(child)}
                    className="rounded-full text-muted-foreground hover:text-primary"
                    title="Punkte anpassen"
                  >
                    <Coins className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleResetPoints(child.id)}
                    className="rounded-full text-muted-foreground hover:text-warning"
                    title="Punkte zurücksetzen"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(child)} className="rounded-full">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(child.id)}
                    className="rounded-full text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {children.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">Noch keine Kinder hinzugefuegt</div>
        )}
      </div>

      <AnimatePresence>
        {adjustingPointsChild && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setAdjustingPointsChild(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <ChildAvatar avatar={adjustingPointsChild.avatar} color={adjustingPointsChild.color} size="md" />
                <div>
                  <h3 className="font-bold text-lg text-foreground">{adjustingPointsChild.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Aktuell: <span className="font-semibold text-primary">{adjustingPointsChild.points} Punkte</span>
                  </p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Punkte anpassen</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12 bg-transparent"
                      onClick={() => setPointsAmount((prev) => prev - 1)}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    <input
                      type="number"
                      value={pointsAmount}
                      onChange={(e) => setPointsAmount(Number(e.target.value))}
                      className={cn(
                        "flex-1 text-center text-2xl font-bold py-3 rounded-xl border border-border bg-background",
                        pointsAmount > 0 && "text-green-500",
                        pointsAmount < 0 && "text-red-500",
                        pointsAmount === 0 && "text-foreground",
                      )}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12 bg-transparent"
                      onClick={() => setPointsAmount((prev) => prev + 1)}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  {quickAdjustPresets.map((preset) => (
                    <div key={preset} className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-red-500 border-red-200 hover:bg-red-50 bg-transparent"
                        onClick={() => setPointsAmount(-preset)}
                      >
                        -{preset}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-green-500 border-green-200 hover:bg-green-50 bg-transparent"
                        onClick={() => setPointsAmount(preset)}
                      >
                        +{preset}
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Reason Input */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Grund (optional)</label>
                  <input
                    type="text"
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                    placeholder={pointsAmount >= 0 ? "z.B. Bonus für gutes Verhalten" : "z.B. Strafe für Regelbruch"}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground"
                  />
                </div>

                {/* Preview */}
                {pointsAmount !== 0 && (
                  <div className="bg-secondary/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Neuer Punktestand</p>
                    <p className="text-3xl font-bold text-foreground">
                      {Math.max(0, adjustingPointsChild.points + pointsAmount)}
                    </p>
                    <p className={cn("text-sm font-medium", pointsAmount > 0 ? "text-green-500" : "text-red-500")}>
                      {pointsAmount > 0 ? "+" : ""}
                      {pointsAmount} Punkte
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl bg-transparent"
                    onClick={() => setAdjustingPointsChild(null)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    className={cn(
                      "flex-1 rounded-xl",
                      pointsAmount > 0 && "bg-green-500 hover:bg-green-600",
                      pointsAmount < 0 && "bg-red-500 hover:bg-red-600",
                    )}
                    onClick={handleAdjustPoints}
                    disabled={pointsAmount === 0}
                  >
                    {pointsAmount >= 0 ? "Hinzufuegen" : "Abziehen"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
