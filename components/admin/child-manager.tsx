"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Edit, Check, X, ChevronUp, ChevronDown } from "lucide-react"
import { useFamily } from "@/context/family-context"
import { useChildren, type ChildProfile } from "@/hooks/useChildren"
import { Button } from "@/components/ui/button"
import { ChildAvatar } from "@/components/child/child-avatar"
import { ChildPoints } from "@/components/points/child-points"
import { AddChildForm } from "@/components/child/add-child-form"
import { AVATARS, CHILD_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function ChildManager() {
  const { state, dispatch } = useFamily()
  const { children, addChild, updateChild, deleteChild } = useChildren()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingChild, setEditingChild] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Pick<ChildProfile, "name" | "avatar" | "color" | "age">>>({})

  const scrollPositionRef = useRef<number>(0)
  const isRestoringScrollRef = useRef<boolean>(false)

  useEffect(() => {
    if (isRestoringScrollRef.current && editingChild) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current)
        isRestoringScrollRef.current = false
      })
    }
  }, [editingChild])

  const handleEdit = (child: ChildProfile) => {
    scrollPositionRef.current = window.scrollY
    isRestoringScrollRef.current = true

    setEditingChild(child.id)
    setEditForm({ name: child.name, avatar: child.avatar, color: child.color, age: child.age ?? undefined })
  }

  const handleSaveEdit = async () => {
    if (editingChild && editForm.name) {
      await updateChild(editingChild, {
        name: editForm.name,
        avatar: editForm.avatar,
        color: editForm.color,
        age: editForm.age ?? null,
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
    if (
      confirm(
        "Kind deaktivieren? Es verschwindet aus der Liste, bleibt aber in der Cloud (Soft-Delete). Erledigte Aufgaben bleiben erhalten."
      )
    ) {
      const nextId = children.find((c) => c.id !== childId)?.id ?? null
      deleteChild(childId).catch(() => {})
      if (state?.selectedChildId === childId) {
        dispatch({ type: "SELECT_CHILD", payload: nextId })
      }
    }
  }

  const handleMoveChild = (_childId: string, _direction: "up" | "down") => {
    // Reihenfolge kommt aus PowerSync (created_at/Name). Optional: order-Spalte später ergänzen.
  }

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <Button
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full rounded-xl"
        variant={showAddForm ? "secondary" : "default"}
      >
        <Plus className="w-4 h-4 mr-2" />
        Kind hinzufuegen
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
              <AddChildForm
                onSuccess={() => setShowAddForm(false)}
                onCancel={() => setShowAddForm(false)}
                onAdd={async (params) => {
                  await addChild({ name: params.name, avatar: params.avatar, color: params.color, age: params.age })
                }}
              />
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
                  <ChildAvatar avatar={child.avatar} color={child.color} size="md" />
                  <div>
                    <p className="font-semibold text-foreground">{child.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {child.age != null ? `${child.age} Jahre` : "Alter nicht angegeben"} |{" "}
                      <ChildPoints childId={child.id} labelOnly showLoading className="inline" />
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
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

    </div>
  )
}
