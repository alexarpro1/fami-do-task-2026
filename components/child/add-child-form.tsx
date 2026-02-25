"use client"

import type React from "react"

import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AVATARS, CHILD_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface AddChildFormParams {
  name: string
  avatar: string
  color: string
  age?: number
}

interface AddChildFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  /** PowerSync: Kind in Cloud anlegen. Wenn gesetzt, wird kein dispatch(ADD_CHILD) verwendet. */
  onAdd?: (params: AddChildFormParams) => Promise<void> | void
}

export function AddChildForm({ onSuccess, onCancel, onAdd }: AddChildFormProps) {
  const { dispatch } = useFamily()
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [color, setColor] = useState(CHILD_COLORS[0].value)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (onAdd) {
      await onAdd({
        name: name.trim(),
        avatar,
        color,
        age: Number.parseInt(age) || 0 || undefined,
      })
    } else {
      dispatch({
        type: "ADD_CHILD",
        payload: {
          name: name.trim(),
          age: Number.parseInt(age) || 0,
          avatar,
          color,
        },
      })
    }

    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Selection */}
      <div>
        <Label className="text-base font-medium">Avatar wählen</Label>
        <div className="grid grid-cols-8 gap-2 mt-2">
          {AVATARS.map((av) => (
            <button
              key={av}
              type="button"
              onClick={() => setAvatar(av)}
              className={cn(
                "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all",
                avatar === av ? "bg-primary/20 scale-110 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/80",
              )}
            >
              {av}
            </button>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      <div>
        <Label className="text-base font-medium">Farbe wählen</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {CHILD_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                color === c.value && "ring-2 ring-offset-2 ring-foreground scale-110",
              )}
              style={{ backgroundColor: c.value }}
            >
              {color === c.value && <Check className="w-5 h-5 text-white drop-shadow-md" />}
            </button>
          ))}
        </div>
      </div>

      {/* Name Input */}
      <div>
        <Label htmlFor="name" className="text-base font-medium">
          Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name des Kindes"
          className="mt-2 h-12 rounded-xl"
          required
        />
      </div>

      {/* Age Input */}
      <div>
        <Label htmlFor="age" className="text-base font-medium">
          Alter (optional)
        </Label>
        <Input
          id="age"
          type="number"
          min="0"
          max="18"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="z.B. 8"
          className="mt-2 h-12 rounded-xl"
        />
      </div>

      {/* Preview */}
      <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ backgroundColor: color + "30" }}
        >
          {avatar}
        </div>
        <div>
          <p className="font-semibold text-foreground">{name || "Vorschau"}</p>
          {age && <p className="text-sm text-muted-foreground">{age} Jahre</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-xl bg-transparent">
            Abbrechen
          </Button>
        )}
        <Button type="submit" disabled={!name.trim()} className="flex-1 h-12 rounded-xl">
          Kind hinzufügen
        </Button>
      </div>
    </form>
  )
}
