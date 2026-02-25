"use client"

import { useFamily } from "@/context/family-context"
import { useSelectedChild } from "@/hooks/useChildren"
import { ChildAvatar } from "./child-avatar"
import { ChildPoints } from "@/components/points/child-points"
import { X, UserPlus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ChildSelectorModalProps {
  open: boolean
  onClose: () => void
}

export function ChildSelectorModal({ open, onClose }: ChildSelectorModalProps) {
  const { dispatch } = useFamily()
  const { children, selectedChildId } = useSelectedChild()

  if (!open) return null

  const handleSelectChild = (childId: string) => {
    dispatch({ type: "SELECT_CHILD", payload: childId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 animate-bounce-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <h2 className="font-[var(--font-fredoka)] text-xl font-bold text-foreground mb-6 text-center">Kind wechseln</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => handleSelectChild(child.id)}
              className={cn(
                "flex flex-col items-center p-3 rounded-2xl transition-all",
                selectedChildId === child.id ? "bg-primary/10 scale-105" : "hover:bg-secondary",
              )}
            >
              <ChildAvatar
                avatar={child.avatar}
                color={child.color}
                size="lg"
                selected={selectedChildId === child.id}
              />
              <span className="font-medium text-foreground mt-2 text-sm">{child.name}</span>
              <ChildPoints childId={child.id} labelOnly showLoading className="text-xs text-muted-foreground" />
            </button>
          ))}
        </div>

        <Link
          href="/admin"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-3 bg-secondary rounded-xl text-muted-foreground hover:bg-secondary/80 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Kind hinzufügen</span>
        </Link>
      </div>
    </div>
  )
}
